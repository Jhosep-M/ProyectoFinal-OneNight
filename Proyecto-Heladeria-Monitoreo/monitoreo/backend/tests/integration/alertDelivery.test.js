require('../helpers/env');
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const { dbTest } = require('../helpers/env');

const ORG = '11111111-1111-4111-8111-111111111111';
let sequelize; let env; let posMock;

// POS falso: registra cada petición y responde según el handler de la prueba.
function crearPosMock(handler) {
  const server = http.createServer((req, res) => {
    let cuerpo = '';
    req.on('data', (c) => { cuerpo += c; });
    req.on('end', () => {
      server.peticiones.push({
        url: req.url,
        apiKey: req.headers['x-api-key'],
        cuerpo: JSON.parse(cuerpo || '{}'),
      });
      handler(req, res, server.peticiones.length);
    });
  });
  server.peticiones = [];
  return server;
}

async function crearAlertaConEntrega({ intentos = 0, proximo = null } = {}) {
  const [alerta] = await sequelize.query(
    `INSERT INTO alerta (organizacion_id, nivel, tipo_recurso, mensaje, fecha_generacion, estado)
     VALUES (:org, 'critico', 'agua', 'Consumo de agua de 3000 litros alcanzó el nivel "critico".', now(), 'pendiente')
     RETURNING id`,
    { replacements: { org: ORG }, type: require('sequelize').QueryTypes.SELECT },
  );
  await sequelize.query(
    `INSERT INTO entrega_alerta (alerta_id, estado, intentos, proximo_intento)
     VALUES (:aid, 'pendiente', :i, :p)`,
    { replacements: { aid: alerta.id, i: intentos, p: proximo } },
  );
  return alerta.id;
}

before(async () => {
  if (!process.env.MONITOREO_TEST_DATABASE_URL) return;
  ({ sequelize } = require('../../src/config/database'));
  ({ env } = require('../../src/config/environment'));
  await sequelize.authenticate();
  await require('../helpers/fixtures').prepararSchema();
  const { entregarUnaVez } = require('../../src/jobs/alertDeliveryWorker');
  global.entregarUnaVez = entregarUnaVez;
});
after(async () => {
  posMock?.close();
  if (sequelize) await sequelize.close();
});

dbTest('Review #5: entrega exitosa → enviada, alerta entregada, payload y Bearer correctos, auditado', async () => {
  posMock = crearPosMock((_req, res) => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":true}'); });
  await new Promise((r) => posMock.listen(0, r));
  env.posAlertsUrl = `http://127.0.0.1:${posMock.address().port}/api/v1/integrations/alerts`;
  env.posAlertsApiKey = 'clave-pos-test';

  const alertaId = await crearAlertaConEntrega();
  const r = await global.entregarUnaVez();
  assert.strictEqual(r, 'enviada');

  const p = posMock.peticiones[0];
  assert.strictEqual(p.apiKey, 'clave-pos-test');
  assert.strictEqual(p.cuerpo.alertaId, alertaId);
  assert.strictEqual(p.cuerpo.nivel, 'critico');
  assert.strictEqual(p.cuerpo.tipoRecurso, 'agua');
  assert.ok(typeof p.cuerpo.mensaje === 'string' && p.cuerpo.mensaje.length > 10);
  assert.ok(!Number.isNaN(Date.parse(p.cuerpo.fechaGeneracion)), 'fechaGeneracion ISO parseable');

  const [ent] = await sequelize.query('SELECT * FROM entrega_alerta WHERE alerta_id = :id', { replacements: { id: alertaId } });
  assert.strictEqual(ent[0].estado, 'enviada');
  assert.strictEqual(ent[0].intentos, 1);
  const [al] = await sequelize.query('SELECT estado FROM alerta WHERE id = :id', { replacements: { id: alertaId } });
  assert.strictEqual(al[0].estado, 'entregada');
  const [aud] = await sequelize.query(
    `SELECT count(*)::int n FROM auditoria_cambio WHERE entidad='entrega_alerta' AND accion='entregar' AND entidad_id = :id`,
    { replacements: { id: ent[0].id } });
  assert.strictEqual(aud[0].n, 1, 'entrega auditada');
});

dbTest('Review #5: POS responde 500 → reintento con backoff, sin perder la fila', async () => {
  posMock.close();
  posMock = crearPosMock((_req, res) => { res.writeHead(500); res.end('boom'); });
  await new Promise((r) => posMock.listen(0, r));
  env.posAlertsUrl = `http://127.0.0.1:${posMock.address().port}/api/v1/integrations/alerts`;

  const alertaId = await crearAlertaConEntrega();
  const r = await global.entregarUnaVez();
  assert.strictEqual(r, 'reintento');

  const [ent] = await sequelize.query('SELECT * FROM entrega_alerta WHERE alerta_id = :id', { replacements: { id: alertaId } });
  assert.strictEqual(ent[0].estado, 'pendiente', 'sigue en cola');
  assert.strictEqual(ent[0].intentos, 1);
  assert.ok(new Date(ent[0].proximo_intento) > new Date(), 'backoff en el futuro');
  assert.ok(ent[0].ultimo_error.includes('500'), `ultimo_error debe citar el status: ${ent[0].ultimo_error}`);
  const [aud] = await sequelize.query(
    `SELECT count(*)::int n FROM auditoria_cambio WHERE entidad='entrega_alerta' AND accion='reintentar' AND entidad_id = :id`,
    { replacements: { id: ent[0].id } });
  assert.strictEqual(aud[0].n, 1, 'cada intento queda auditado');
});

dbTest('Review #5: POS devuelve 404 (endpoint aún no existe, Paso 2 de P4) → reintentable, no terminal', async () => {
  posMock.close();
  posMock = crearPosMock((_req, res) => { res.writeHead(404); res.end('no found'); });
  await new Promise((r) => posMock.listen(0, r));
  env.posAlertsUrl = `http://127.0.0.1:${posMock.address().port}/api/v1/integrations/alerts`;

  const alertaId = await crearAlertaConEntrega();
  const r = await global.entregarUnaVez();
  assert.strictEqual(r, 'reintento');
  const [ent] = await sequelize.query('SELECT * FROM entrega_alerta WHERE alerta_id = :id', { replacements: { id: alertaId } });
  assert.strictEqual(ent[0].estado, 'pendiente', '404 = fallo transitorio hasta que P4 levante el endpoint');
});

dbTest('Review #5: timeout del POS → abort, reintento (DELIVERY_TIMEOUT_MS corto)', async () => {
  posMock.close();
  posMock = crearPosMock((_req, res) => {
    setTimeout(() => { try { res.writeHead(200); res.end(); } catch { /* ya abortado */ } }, 1500);
  });
  await new Promise((r) => posMock.listen(0, r));
  env.posAlertsUrl = `http://127.0.0.1:${posMock.address().port}/api/v1/integrations/alerts`;
  const timeoutPrevio = env.deliveryTimeoutMs;
  env.deliveryTimeoutMs = 200;
  try {
    const alertaId = await crearAlertaConEntrega();
    const r = await global.entregarUnaVez();
    assert.strictEqual(r, 'reintento');
    const [ent] = await sequelize.query('SELECT * FROM entrega_alerta WHERE alerta_id = :id', { replacements: { id: alertaId } });
    assert.strictEqual(ent[0].estado, 'pendiente');
    assert.ok(ent[0].ultimo_error.length > 0, 'el timeout deja rastro en ultimo_error');
  } finally {
    env.deliveryTimeoutMs = timeoutPrevio;
  }
});

dbTest('Review #5: agota DELIVERY_MAX_INTENTOS → estado error terminal, alerta en error y fuera de la cola', async () => {
  posMock.close();
  posMock = crearPosMock((_req, res) => { res.writeHead(500); res.end('boom'); });
  await new Promise((r) => posMock.listen(0, r));
  env.posAlertsUrl = `http://127.0.0.1:${posMock.address().port}/api/v1/integrations/alerts`;

  const maxPrevio = env.deliveryMaxIntentos;
  env.deliveryMaxIntentos = 3;
  try {
    const alertaId = await crearAlertaConEntrega({ intentos: 2 }); // queda en 3 tras el reclamo
    const r = await global.entregarUnaVez();
    assert.strictEqual(r, 'error_terminal');

    const [ent] = await sequelize.query('SELECT * FROM entrega_alerta WHERE alerta_id = :id', { replacements: { id: alertaId } });
    assert.strictEqual(ent[0].estado, 'error');
    assert.strictEqual(ent[0].intentos, 3);
    assert.strictEqual(ent[0].proximo_intento, null, 'sin siguiente intento');
    const [al] = await sequelize.query('SELECT estado FROM alerta WHERE id = :id', { replacements: { id: alertaId } });
    assert.strictEqual(al[0].estado, 'error');

    const r2 = await global.entregarUnaVez();
    assert.strictEqual(r2, 'vacia', 'las filas terminales no se reclaman más (sin loop infinito)');
  } finally {
    env.deliveryMaxIntentos = maxPrevio;
  }
});

dbTest('sin POS_ALERTS_URL configurado → fallo controlado, fila pendiente (nunca excepción fuera del worker)', async () => {
  const urlPrevia = env.posAlertsUrl;
  env.posAlertsUrl = '';
  try {
    const alertaId = await crearAlertaConEntrega();
    const r = await global.entregarUnaVez();
    assert.strictEqual(r, 'reintento');
    const [ent] = await sequelize.query('SELECT * FROM entrega_alerta WHERE alerta_id = :id', { replacements: { id: alertaId } });
    assert.strictEqual(ent[0].estado, 'pendiente');
    assert.ok(ent[0].ultimo_error.includes('POS_ALERTS_URL'));
  } finally {
    env.posAlertsUrl = urlPrevia;
  }
});
