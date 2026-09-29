require('../helpers/env');
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const { dbTest } = require('../helpers/env');
const crypto = require('crypto');

const ORG = '11111111-1111-4111-8111-111111111111';
let server; let base; let sequelize; let apiKey;

function nuevoPayload(sobrescribir = {}) {
  return {
    consumoExternoId: crypto.randomUUID(),
    idempotencyKey: crypto.randomUUID(),
    tipoRecurso: 'agua',
    cantidad: 125.5,
    unidadMedida: 'litros',
    fechaConsumo: new Date().toISOString(),
    origen: 'POS',
    ...sobrescribir,
  };
}

async function enviar(payload, key = apiKey) {
  return fetch(`${base}/api/v1/integrations/consumption`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify(payload),
  });
}

before(async () => {
  if (!process.env.MONITOREO_TEST_DATABASE_URL) return;
  ({ sequelize } = require('../../src/config/database'));
  await sequelize.authenticate();
  const fx = require('../helpers/fixtures');
  await fx.prepararSchema();
  apiKey = await fx.seedIntegracion('POS colaWorker (test)');
  const { testApp, listen } = require('../helpers/testApp');
  const { integrationsRouter } = require('../../src/routes/integrations.routes');
  const app = testApp(null, [['/api/v1/integrations', integrationsRouter]]); // auth real dentro del router
  const l = await listen(app);
  server = l.server; base = l.base;
});
after(() => { server?.close(); return sequelize?.close(); });

dbTest('recepción válida → 201, crea recepcion + cola + auditoría en la misma transacción', async () => {
  const payload = nuevoPayload();
  const res = await enviar(payload);
  assert.strictEqual(res.status, 201);
  const body = await res.json();
  assert.strictEqual(body.duplicado, false);
  assert.ok(body.recepcionId);

  const [filas] = await sequelize.query(
    `SELECT r.id, r.estado, c.id AS cola_id, c.estado AS cola_estado
       FROM recepcion_consumo_pos r
       JOIN cola_procesamiento c ON c.recepcion_id = r.id
      WHERE r.id = :id`,
    { replacements: { id: body.recepcionId } },
  );
  assert.strictEqual(filas.length, 1, 'recepcion + cola existen');
  assert.strictEqual(filas[0].estado, 'recibido');
  assert.strictEqual(filas[0].cola_estado, 'pendiente');

  const [aud] = await sequelize.query(
    `SELECT count(*)::int n FROM auditoria_cambio
      WHERE entidad='recepcion_consumo_pos' AND accion='recibir' AND entidad_id = :id`,
    { replacements: { id: body.recepcionId } },
  );
  assert.strictEqual(aud[0].n, 1, 'auditoría de recepción');
});

dbTest('Review #1: reenvío con la misma idempotencyKey → 200 duplicado, cero filas nuevas', async () => {
  const payload = nuevoPayload();
  const r1 = await enviar(payload);
  assert.strictEqual(r1.status, 201);
  const b1 = await r1.json();

  const r2 = await enviar(payload); // el POS "perdió" la respuesta y reintenta
  assert.strictEqual(r2.status, 200, 'segunda entrega es 2xx para que el POS marque enviado');
  const b2 = await r2.json();
  assert.strictEqual(b2.duplicado, true);
  assert.strictEqual(b2.recepcionId, b1.recepcionId, 'devuelve la misma recepción');

  const [cnt] = await sequelize.query('SELECT count(*)::int n FROM recepcion_consumo_pos WHERE idempotency_key = :k', { replacements: { k: payload.idempotencyKey } });
  assert.strictEqual(cnt[0].n, 1, 'exactamente una recepción');
  const [cola] = await sequelize.query('SELECT count(*)::int n FROM cola_procesamiento WHERE recepcion_id = :id', { replacements: { id: b1.recepcionId } });
  assert.strictEqual(cola[0].n, 1, 'exactamente una cola: nada que procesar dos veces');
});

dbTest('Review #1b: mismo consumoExternoId con key distinta también deduplica', async () => {
  const payload = nuevoPayload();
  const r1 = await enviar(payload);
  assert.strictEqual(r1.status, 201);
  const r2 = await enviar({ ...payload, idempotencyKey: crypto.randomUUID() });
  assert.strictEqual(r2.status, 200);
  assert.strictEqual((await r2.json()).duplicado, true);
  const [cnt] = await sequelize.query('SELECT count(*)::int n FROM recepcion_consumo_pos WHERE consumo_externo_id = :id', { replacements: { id: payload.consumoExternoId } });
  assert.strictEqual(cnt[0].n, 1);
});

dbTest('Review #2: dos envíos CONCURRENTES con la misma key → una fila, sin 500', async () => {
  const payload = nuevoPayload();
  const [a, b] = await Promise.all([enviar(payload), enviar(payload)]);
  const statuses = [a.status, b.status].sort();
  assert.deepStrictEqual(statuses, [200, 201], `esperaba [200,201], llegó ${statuses}`);
  const [cnt] = await sequelize.query('SELECT count(*)::int n FROM recepcion_consumo_pos WHERE idempotency_key = :k', { replacements: { k: payload.idempotencyKey } });
  assert.strictEqual(cnt[0].n, 1, 'la UNIQUE constraint decide; jamás 2 filas');
  for (const r of [a, b]) {
    const texto = JSON.stringify(await r.clone().json());
    assert.ok(!texto.includes(' at '), 'sin stack traces en la respuesta');
  }
});

dbTest('payload inválido → 400 con detalle por campo (nunca llega a la BD)', async () => {
  const antes = (await sequelize.query('SELECT count(*)::int n FROM recepcion_consumo_pos'))[0][0].n;
  const res = await enviar(nuevoPayload({ cantidad: -5 }));
  assert.strictEqual(res.status, 400);
  const body = await res.json();
  assert.strictEqual(body.error, 'Payload inválido');
  assert.ok(body.detail.some((i) => i.path === 'cantidad'));
  const despues = (await sequelize.query('SELECT count(*)::int n FROM recepcion_consumo_pos'))[0][0].n;
  assert.strictEqual(despues, antes, 'cero inserciones');
});

dbTest('sin API key → 401; key inválida → 401 (hash, jamás texto plano)', async () => {
  const sin = await fetch(`${base}/api/v1/integrations/consumption`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nuevoPayload()),
  });
  assert.strictEqual(sin.status, 401);

  const mala = await enviar(nuevoPayload(), 'key-inexistente-123');
  assert.strictEqual(mala.status, 401);

  const [filas] = await sequelize.query('SELECT api_key_hash FROM integracion');
  for (const f of filas) {
    assert.strictEqual(f.api_key_hash.length, 64, 'solo hashes sha256 (64 hex)');
    assert.ok(!f.api_key_hash.includes(apiKey), 'la key plaintext no vive en la BD');
  }
});

dbTest('organizacionExternaId ajena → 403; ausente → resuelta desde la integración (brecha de contrato)', async () => {
  const ajena = '99999999-9999-4999-8999-999999999999';
  const r = await enviar(nuevoPayload({ organizacionExternaId: ajena }));
  assert.strictEqual(r.status, 403);

  const r2 = await enviar(nuevoPayload()); // sin organizacionExternaId (como envía el POS real)
  assert.strictEqual(r2.status, 201, 'se resuelve la org desde integracion.organizacion_id');
  const b2 = await r2.json();
  const [fila] = await sequelize.query('SELECT organizacion_id FROM recepcion_consumo_pos WHERE id = :id', { replacements: { id: b2.recepcionId } });
  assert.strictEqual(fila[0].organizacion_id, ORG);
});
