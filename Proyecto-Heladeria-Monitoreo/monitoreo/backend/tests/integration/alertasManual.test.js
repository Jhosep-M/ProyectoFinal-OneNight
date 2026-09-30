require('../helpers/env');
const { before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const crypto = require('crypto');
const { QueryTypes } = require('sequelize');
const { dbTest } = require('../helpers/env');

const ORG = '11111111-1111-4111-8111-111111111111';
let sequelize; let env;

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

function crearPosMock(handler) {
  const server = http.createServer((req, res) => {
    let cuerpo = '';
    req.on('data', (c) => { cuerpo += c; });
    req.on('end', () => {
      server.peticiones.push({ url: req.url, apiKey: req.headers['x-api-key'], cuerpo: JSON.parse(cuerpo || '{}') });
      handler(req, res, server.peticiones.length);
    });
  });
  server.peticiones = [];
  return server;
}

async function crearAlertaConEntrega({ estadoEntrega = 'pendiente', intentos = 0, org = ORG } = {}) {
  const [alerta] = await sequelize.query(
    `INSERT INTO alerta (organizacion_id, nivel, tipo_recurso, mensaje, fecha_generacion, estado)
     VALUES (:org, 'critico', 'agua', 'Alerta de prueba', now(), 'pendiente') RETURNING id`,
    { replacements: { org }, type: QueryTypes.SELECT },
  );
  await sequelize.query(
    `INSERT INTO entrega_alerta (alerta_id, estado, intentos, proximo_intento)
     VALUES (:aid, :estado, :i, :p)`,
    { replacements: { aid: alerta.id, estado: estadoEntrega, i: intentos, p: null } },
  );
  return alerta.id;
}

before(async () => {
  if (!process.env.MONITOREO_TEST_DATABASE_URL) return;
  ({ sequelize } = require('../../src/config/database'));
  ({ env } = require('../../src/config/environment'));
  await sequelize.authenticate();
  await require('../helpers/fixtures').prepararSchema();
});

after(async () => {
  if (sequelize) await sequelize.close();
});

dbTest('crearAlertaManual: crea alerta + entrega pendiente + auditoría (origen manual)', async () => {
  env.posAlertsUrl = ''; // entrega inmediata falla rápido; la cola mantiene la fila
  const { crearAlertaManual } = require('../../src/services/alertas.service');
  const alerta = await crearAlertaManual({ organizacionId: ORG, nivel: 'critico', tipoRecurso: 'agua', mensaje: 'Prueba manual' });
  await esperar(50); // deja asentar la entrega inmediata fire-and-forget

  assert.strictEqual(alerta.organizacion_id, ORG);
  assert.strictEqual(alerta.nivel, 'critico');
  assert.strictEqual(alerta.tipo_recurso, 'agua');
  assert.strictEqual(alerta.registro_consumo_id, null);
  assert.strictEqual(alerta.umbral_id, null);

  const [ent] = await sequelize.query('SELECT * FROM entrega_alerta WHERE alerta_id = :id', { replacements: { id: alerta.id } });
  assert.strictEqual(ent.length, 1, 'la entrega queda encolada');
  assert.strictEqual(ent[0].estado, 'pendiente');

  const [aud] = await sequelize.query(
    `SELECT detalle FROM auditoria_cambio WHERE entidad='alerta' AND accion='crear' AND entidad_id = :id`,
    { replacements: { id: alerta.id } });
  assert.strictEqual(aud.length, 1, 'creación auditada');
  assert.strictEqual(aud[0].detalle.origen, 'manual');
});

dbTest('crearAlertaManual sin mensaje usa uno por defecto', async () => {
  env.posAlertsUrl = '';
  const { crearAlertaManual } = require('../../src/services/alertas.service');
  const alerta = await crearAlertaManual({ organizacionId: ORG, nivel: 'alerta', tipoRecurso: 'energia' });
  await esperar(50);
  assert.ok(alerta.mensaje.length > 0);
  assert.ok(alerta.mensaje.toLowerCase().includes('energia'));
});

dbTest('reenviarAlerta: devuelve la entrega a pendiente y audita', async () => {
  env.posAlertsUrl = ''; // la entrega inmediata vuelve a fallar; el estado final es pendiente
  const { reenviarAlerta } = require('../../src/services/alertas.service');
  const alertaId = await crearAlertaConEntrega({ estadoEntrega: 'enviada', intentos: 3 });

  await reenviarAlerta(alertaId);
  await esperar(50);

  const [ent] = await sequelize.query('SELECT * FROM entrega_alerta WHERE alerta_id = :id', { replacements: { id: alertaId } });
  assert.strictEqual(ent[0].estado, 'pendiente');
  const [al] = await sequelize.query('SELECT estado FROM alerta WHERE id = :id', { replacements: { id: alertaId } });
  assert.strictEqual(al[0].estado, 'pendiente');
  const [aud] = await sequelize.query(
    `SELECT count(*)::int n FROM auditoria_cambio WHERE entidad='alerta' AND accion='reenviar' AND entidad_id = :id`,
    { replacements: { id: alertaId } });
  assert.strictEqual(aud[0].n, 1);
});

dbTest('reenviarAlerta: id inexistente -> 404', async () => {
  const { reenviarAlerta } = require('../../src/services/alertas.service');
  await assert.rejects(
    () => reenviarAlerta(crypto.randomUUID()),
    (e) => e.status === 404,
  );
});

dbTest('controller reenviar: org ajena -> 404 uniforme; org propia -> 200', async () => {
  env.posAlertsUrl = '';
  const ctrl = require('../../src/controllers/alertas.controller');
  const fakeRes = () => ({
    statusCode: 200, body: null,
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
  });

  const alertaId = await crearAlertaConEntrega({ estadoEntrega: 'enviada', intentos: 2 });

  const ajena = fakeRes();
  await ctrl.reenviar({ params: { id: alertaId }, orgIds: [crypto.randomUUID()], user: { id: crypto.randomUUID() }, id: 'r1' }, ajena);
  assert.strictEqual(ajena.statusCode, 404);

  const propia = fakeRes();
  await ctrl.reenviar({ params: { id: alertaId }, orgIds: [ORG], user: { id: crypto.randomUUID() }, id: 'r2' }, propia);
  assert.strictEqual(propia.statusCode, 200);
  await esperar(50); // deja asentar la entrega inmediata fire-and-forget (url='') antes del siguiente test
});

dbTest('entregarAlertaPorId: entrega una alerta concreta al POS (x-api-key, alertaId correcto)', async () => {
  const posMock = crearPosMock((_req, res) => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"received":true}'); });
  await new Promise((r) => posMock.listen(0, r));
  try {
    env.posAlertsUrl = `http://127.0.0.1:${posMock.address().port}/api/v1/integrations/alerts`;
    env.posAlertsApiKey = 'clave-pos-test';

    const { entregarAlertaPorId } = require('../../src/jobs/alertDeliveryWorker');
    const alertaId = await crearAlertaConEntrega();
    const r = await entregarAlertaPorId(alertaId);
    assert.strictEqual(r, 'enviada');

    const p = posMock.peticiones.find((x) => x.cuerpo.alertaId === alertaId);
    assert.ok(p, 'el POS recibió la alerta esperada');
    assert.strictEqual(p.apiKey, 'clave-pos-test');
    assert.strictEqual(p.cuerpo.nivel, 'critico');

    const [ent] = await sequelize.query('SELECT estado FROM entrega_alerta WHERE alerta_id = :id', { replacements: { id: alertaId } });
    assert.strictEqual(ent[0].estado, 'enviada');
  } finally {
    posMock.close();
  }
});
