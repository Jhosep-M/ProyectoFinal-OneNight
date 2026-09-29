require('../helpers/env');
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { dbTest } = require('../helpers/env');
const crypto = require('crypto');

const ORG = '11111111-1111-4111-8111-111111111111';
let sequelize; let processColaOnce;

async function encolarConsumo({ cantidad = 125.5, org = ORG, tipo = 'agua' } = {}) {
  const idExt = crypto.randomUUID();
  const [r] = await sequelize.query(
    `INSERT INTO recepcion_consumo_pos
       (consumo_externo_id, idempotency_key, organizacion_id, tipo_recurso, cantidad, unidad_medida, fecha_consumo, origen, estado)
     VALUES (:idExt, :key, :org, :tipo, :c, 'litros', now(), 'POS', 'recibido')
     RETURNING id`,
    { replacements: { idExt, key: crypto.randomUUID(), org, tipo, c: cantidad }, type: require('sequelize').QueryTypes.SELECT },
  );
  await sequelize.query(
    `INSERT INTO cola_procesamiento (recepcion_id, estado, intentos) VALUES (:id, 'pendiente', 0)`,
    { replacements: { id: r.id } },
  );
  return r.id;
}

before(async () => {
  if (!process.env.MONITOREO_TEST_DATABASE_URL) return;
  ({ sequelize } = require('../../src/config/database'));
  await sequelize.authenticate();
  await require('../helpers/fixtures').prepararSchema();
  ({ processColaOnce } = require('../../src/jobs/processingWorker'));
});
after(async () => { if (sequelize) await sequelize.close(); });

dbTest('consumo normal → registro clasificado normal, sin alerta, cola procesada', async () => {
  const recepcionId = await encolarConsumo({ cantidad: 500 });
  const n = await processColaOnce({ limite: 5 });
  assert.ok(n >= 1);

  const [reg] = await sequelize.query(
    'SELECT * FROM registro_consumo WHERE recepcion_id = :id', { replacements: { id: recepcionId } });
  assert.strictEqual(reg.length, 1);
  assert.strictEqual(reg[0].clasificacion, 'normal');

  const [cola] = await sequelize.query('SELECT estado, intentos FROM cola_procesamiento WHERE recepcion_id = :id', { replacements: { id: recepcionId } });
  assert.strictEqual(cola[0].estado, 'procesado');

  const [rec] = await sequelize.query('SELECT estado FROM recepcion_consumo_pos WHERE id = :id', { replacements: { id: recepcionId } });
  assert.strictEqual(rec[0].estado, 'procesado');

  const [alertas] = await sequelize.query('SELECT count(*)::int n FROM alerta WHERE registro_consumo_id = :id', { replacements: { id: reg[0].id } });
  assert.strictEqual(alertas[0].n, 0, 'nivel normal no genera alerta');

  const [aud] = await sequelize.query(
    `SELECT count(*)::int n FROM auditoria_cambio WHERE entidad='registro_consumo' AND accion='clasificar' AND entidad_id = :id`,
    { replacements: { id: reg[0].id } });
  assert.strictEqual(aud[0].n, 1, 'clasificación auditada');
});

dbTest('consumo que cae en la banda alerta → alerta + notificación + entrega encolada', async () => {
  const recepcionId = await encolarConsumo({ cantidad: 1200 }); // banda alerta [1000,1500)
  await processColaOnce({ limite: 5 });

  const [reg] = await sequelize.query('SELECT * FROM registro_consumo WHERE recepcion_id = :id', { replacements: { id: recepcionId } });
  assert.strictEqual(reg[0].clasificacion, 'alerta');

  const [alertas] = await sequelize.query('SELECT * FROM alerta WHERE registro_consumo_id = :id', { replacements: { id: reg[0].id } });
  assert.strictEqual(alertas.length, 1);
  assert.strictEqual(alertas[0].nivel, 'alerta');
  assert.ok(alertas[0].mensaje.length > 10, 'mensaje legible');
  assert.strictEqual(alertas[0].estado, 'pendiente');

  const [notifs] = await sequelize.query('SELECT count(*)::int n FROM notificacion WHERE alerta_id = :id', { replacements: { id: alertas[0].id } });
  assert.ok(notifs[0].n >= 1, 'broadcast de notificación creado');

  const [entregas] = await sequelize.query('SELECT * FROM entrega_alerta WHERE alerta_id = :id', { replacements: { id: alertas[0].id } });
  assert.strictEqual(entregas.length, 1, 'entrega pendiente para el worker del Task 8');
  assert.strictEqual(entregas[0].estado, 'pendiente');

  const [aud] = await sequelize.query(
    `SELECT count(*)::int n FROM auditoria_cambio WHERE entidad='alerta' AND accion='crear' AND entidad_id = :id`,
    { replacements: { id: alertas[0].id } });
  assert.strictEqual(aud[0].n, 1, 'creación de alerta auditada');
});

dbTest('org sin umbrales → registro sin_umbral y CERO alertas (sin alerta falsa)', async () => {
  const { Organizacion } = require('../../src/models');
  const org2 = await Organizacion.create({ nombre: 'Sin umbrales' });
  const recepcionId = await encolarConsumo({ cantidad: 9999, org: org2.id });
  await processColaOnce({ limite: 5 });
  const [reg] = await sequelize.query('SELECT clasificacion FROM registro_consumo WHERE recepcion_id = :id', { replacements: { id: recepcionId } });
  assert.strictEqual(reg[0].clasificacion, 'sin_umbral');
  const [alertas] = await sequelize.query('SELECT count(*)::int n FROM alerta WHERE organizacion_id = :org', { replacements: { org: org2.id } });
  assert.strictEqual(alertas[0].n, 0);
});

dbTest('Review #3: dos workers concurrentes → un solo registro_consumo (la recepción UNIQUE)', async () => {
  const recepcionId = await encolarConsumo({ cantidad: 100 });
  await Promise.all([processColaOnce({ limite: 5 }), processColaOnce({ limite: 5 })]);
  const [cnt] = await sequelize.query('SELECT count(*)::int n FROM registro_consumo WHERE recepcion_id = :id', { replacements: { id: recepcionId } });
  assert.strictEqual(cnt[0].n, 1, 'SKIP LOCKED + UNIQUE recepcion_id: jamás doble registro');
  const [cola] = await sequelize.query('SELECT estado FROM cola_procesamiento WHERE recepcion_id = :id', { replacements: { id: recepcionId } });
  assert.strictEqual(cola[0].estado, 'procesado');
});

dbTest('re-ejecutar el worker sobre una cola ya procesada no duplica nada', async () => {
  const recepcionId = await encolarConsumo({ cantidad: 1200 });
  await processColaOnce({ limite: 5 });
  const antes = (await sequelize.query('SELECT count(*)::int n FROM registro_consumo'))[0][0].n;
  const alertasAntes = (await sequelize.query('SELECT count(*)::int n FROM alerta'))[0][0].n;
  await processColaOnce({ limite: 5 });
  const despues = (await sequelize.query('SELECT count(*)::int n FROM registro_consumo'))[0][0].n;
  const alertasDespues = (await sequelize.query('SELECT count(*)::int n FROM alerta'))[0][0].n;
  assert.strictEqual(despues, antes, 'cero registros nuevos');
  assert.strictEqual(alertasDespues, alertasAntes, 'cero alertas nuevas');
});

dbTest('fila con error y proximo_intento futuro NO se reclama todavía (backoff)', async () => {
  const recepcionId = await encolarConsumo({ cantidad: 100 });
  await sequelize.query(
    `UPDATE cola_procesamiento SET estado='pendiente', intentos=2, ultimo_error='boom', proximo_intento = now() + interval '10 minutes'
      WHERE recepcion_id = :id`, { replacements: { id: recepcionId } });
  const n = await processColaOnce({ limite: 5 });
  const [reg] = await sequelize.query('SELECT count(*)::int n FROM registro_consumo WHERE recepcion_id = :id', { replacements: { id: recepcionId } });
  assert.strictEqual(reg[0].n, 0, 'backoff respetado: aún no vuelve a intentar');
  assert.ok(n >= 0);
});
