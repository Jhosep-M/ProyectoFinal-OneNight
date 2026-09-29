require('../helpers/env');
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { dbTest } = require('../helpers/env');
const crypto = require('crypto');

const ORG = '11111111-1111-4111-8111-111111111111';
const ADM = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OBS = 'bbbb0000-0000-4000-8000-000000000001';
let server; let base; let serverObs; let baseObs; let sequelize;
let integracionId; // creada por ADMIN en el test de POST (Task 10)

// NOTA T10-1 (precedente T9-1): el seed (Task 2, aprobado) da a `observador`
// solo lectura (consumo/alerta/notificacion/reporte .consultar) — SIN
// integracion.consultar NI integracion.gestionar. El brief pedía un solo
// observador también para POST /integraciones (→ 201), irreconciliable con el
// seed: con observador el POST da 403. ADMIN (admin_monitoreo, todos los
// permisos) corre setup + assertions de crear/listar/rotar; OBSERVADOR corre
// las lecturas genuinas y las negaciones 403/404 de aislamiento.

async function insertarRegistro(org, cantidad) {
  const [tr] = await sequelize.query(`SELECT id FROM tipo_recurso WHERE codigo='agua'`);
  const [r] = await sequelize.query(
    `INSERT INTO recepcion_consumo_pos (consumo_externo_id, idempotency_key, organizacion_id, tipo_recurso, cantidad, unidad_medida, fecha_consumo, origen, estado)
     VALUES (:e, :k, :org, 'agua', :c, 'litros', now(), 'POS', 'procesado') RETURNING id`,
    { replacements: { e: crypto.randomUUID(), k: crypto.randomUUID(), org, c: cantidad }, type: require('sequelize').QueryTypes.SELECT },
  );
  await sequelize.query(
    `INSERT INTO registro_consumo (recepcion_id, organizacion_id, tipo_recurso_id, tipo_recurso, cantidad, unidad_medida, fecha_consumo, clasificacion, origen)
     VALUES (:rid, :org, :tr, 'agua', :c, 'litros', now(), 'normal', 'POS')`,
    { replacements: { rid: r.id, org, tr: tr[0].id, c: cantidad } },
  );
}

function montar(user) {
  const { testApp, listen } = require('../helpers/testApp');
  const { consumoRouter } = require('../../src/routes/consumo.routes');
  const { alertasRouter } = require('../../src/routes/alertas.routes');
  const { notificacionesRouter } = require('../../src/routes/notificaciones.routes');
  const { reportesRouter } = require('../../src/routes/reportes.routes');
  const { integracionesRouter } = require('../../src/routes/integraciones.routes');
  const app = testApp(user, [
    ['/api/v1/consumo', consumoRouter],
    ['/api/v1/alertas', alertasRouter],
    ['/api/v1/notificaciones', notificacionesRouter],
    ['/api/v1/reportes', reportesRouter],
    ['/api/v1/integraciones', integracionesRouter],
  ]);
  return listen(app);
}

before(async () => {
  if (!process.env.MONITOREO_TEST_DATABASE_URL) return;
  ({ sequelize } = require('../../src/config/database'));
  await sequelize.authenticate();
  const fx = require('../helpers/fixtures');
  await fx.prepararSchema();
  await fx.seedUsuarioEnOrg(ADM, 'adm@test.local', 'admin_monitoreo');
  await fx.seedUsuarioEnOrg(OBS, 'obs@test.local', 'observador');
  await insertarRegistro(ORG, 500);
  await insertarRegistro(ORG, 1200);
  // registro de una org ajena: jamás debe aparecer
  const [orgAjena] = await sequelize.query(`INSERT INTO organizacion (nombre) VALUES ('Ajena') RETURNING id`, { type: require('sequelize').QueryTypes.SELECT });
  await insertarRegistro(orgAjena.id, 99999);

  ({ server, base } = await montar({ id: ADM, email: 'adm@test.local' }));
  ({ server: serverObs, base: baseObs } = await montar({ id: OBS, email: 'obs@test.local' }));
});
after(() => { server?.close(); serverObs?.close(); return sequelize?.close(); });

dbTest('GET /consumo pagina y solo muestra la org del membership (total = suma propia)', async () => {
  const res = await fetch(`${baseObs}/api/v1/consumo?organizacionId=${ORG}&page=1&limit=1`);
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.strictEqual(body.data.length, 1, 'limit=1');
  assert.strictEqual(body.total, 2, 'el registro de la org ajena no cuenta');
  assert.strictEqual(body.page, 1);
  assert.strictEqual(body.limit, 1);
  assert.ok(body.data.every((r) => r.organizacion_id === ORG));
});

dbTest('GET /consumo con limit fuera de rango → 400; org ajena → 403', async () => {
  const malo = await fetch(`${baseObs}/api/v1/consumo?organizacionId=${ORG}&limit=5000`);
  assert.strictEqual(malo.status, 400);
  const ajena = await fetch(`${baseObs}/api/v1/consumo?organizacionId=99999999-9999-4999-8999-999999999999`);
  assert.strictEqual(ajena.status, 403);
});

dbTest('GET /reportes/consumo devuelve totales correctos (500+1200=1700 litros) con costo por tarifa vigente', async () => {
  // tarifa que cubre hoy
  const [tr] = await sequelize.query(`SELECT id FROM tipo_recurso WHERE codigo='agua'`);
  await sequelize.query(
    `INSERT INTO tarifa (organizacion_id, tipo_recurso_id, nombre, monto, unidad, fecha_inicio, fecha_fin)
     VALUES (:org, :tr, 'Tarifa anual', 0.05, 'litro', '2026-01-01', '2026-12-31')`,
    { replacements: { org: ORG, tr: tr[0].id } },
  );
  const res = await fetch(`${baseObs}/api/v1/reportes/consumo?organizacionId=${ORG}`);
  assert.strictEqual(res.status, 200);
  const r = await res.json();
  const agua = r.porRecurso.find((x) => x.tipo === 'agua');
  assert.ok(agua, 'debe reportar agua');
  assert.strictEqual(Number(agua.total), 1700, `total esperado 1700, llegó ${agua.total}`);
  assert.strictEqual(agua.registros, 2);
  const costo = r.costoEstimado.find((x) => x.tipo === 'agua');
  assert.ok(costo, 'debe estimar costo');
  assert.strictEqual(Math.round(Number(costo.costo) * 100) / 100, 85, '1700 litros * 0.05 = 85.00');
  assert.ok(Array.isArray(r.alertasPorNivel));
  assert.ok(Array.isArray(r.avanceMetas));
});

dbTest('GET /reportes/consumo sin membresía → 403 (aislamiento)', async () => {
  const [org2] = await sequelize.query(`INSERT INTO organizacion (nombre) VALUES ('Sin tarifa') RETURNING id`, { type: require('sequelize').QueryTypes.SELECT });
  await insertarRegistro(org2.id, 100);
  const res = await fetch(`${baseObs}/api/v1/reportes/consumo?organizacionId=${org2.id}`);
  assert.strictEqual(res.status, 403, 'observador no es miembro de esa org → aislamiento');
});

dbTest('GET /notificaciones trae broadcast + propias; PATCH vista lo marca solo si es suyo', async () => {
  // alerta + notificación (broadcast) en la org demo
  const [al] = await sequelize.query(
    `INSERT INTO alerta (organizacion_id, nivel, tipo_recurso, mensaje, fecha_generacion, estado)
     VALUES (:org, 'alerta', 'agua', 'msj', now(), 'pendiente') RETURNING id`,
    { replacements: { org: ORG }, type: require('sequelize').QueryTypes.SELECT });
  const [nBroadcast] = await sequelize.query(
    `INSERT INTO notificacion (alerta_id, usuario_id, canal, estado) VALUES (:a, NULL, 'in_app', 'pendiente') RETURNING id`,
    { replacements: { a: al[0].id }, type: require('sequelize').QueryTypes.SELECT });

  const lista = await (await fetch(`${baseObs}/api/v1/notificaciones`)).json();
  assert.ok(lista.data.length >= 1, 've la broadcast de su org');

  const patch = await fetch(`${baseObs}/api/v1/notificaciones/${nBroadcast[0].id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accion: 'vista' }),
  });
  assert.strictEqual(patch.status, 200);
  const [n] = await sequelize.query('SELECT * FROM notificacion WHERE id = :id', { replacements: { id: nBroadcast[0].id } });
  assert.strictEqual(n[0].estado, 'vista');
  assert.ok(n[0].vista_en, 'vista_en registrado');
});

dbTest('GET /reportes/auditoria lista acciones de miembros de la org (antes 404)', async () => {
  await sequelize.query(
    `INSERT INTO auditoria_cambio (entidad, accion, usuario_id, detalle)
     VALUES ('medidor', 'test-auditoria', :uid, '{}')`,
    { replacements: { uid: ADM } },
  );
  const res = await fetch(`${baseObs}/api/v1/reportes/auditoria?organizacionId=${ORG}`);
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body.data));
  assert.ok(body.data.some((r) => r.accion === 'test-auditoria'), 've la acción del miembro');
  assert.strictEqual(typeof body.total, 'number');
});

dbTest('POST /integraciones devuelve la API key UNA sola vez; en BD solo hay hash; GET jamás la expone', async () => {
  // Negación genuina: observador sin integracion.gestionar no puede crear.
  const negada = await fetch(`${baseObs}/api/v1/integraciones`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ organizacionId: ORG, nombre: 'intrusa' }),
  });
  assert.strictEqual(negada.status, 403);

  const crear = await fetch(`${base}/api/v1/integraciones`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ organizacionId: ORG, nombre: 'POS prod' }),
  });
  assert.strictEqual(crear.status, 201);
  const cuerpo = await crear.json();
  assert.ok(cuerpo.apiKey && cuerpo.apiKey.length >= 40, 'key entregada en el crear');
  assert.ok(cuerpo.integracion.id);
  integracionId = cuerpo.integracion.id;

  const [filas] = await sequelize.query('SELECT * FROM integracion WHERE id = :id', { replacements: { id: cuerpo.integracion.id } });
  assert.strictEqual(filas[0].api_key_hash.length, 64, 'solo sha256');
  assert.ok(!filas[0].api_key_hash.includes(cuerpo.apiKey), 'plaintext jamás en BD');

  const lista = await (await fetch(`${base}/api/v1/integraciones?organizacionId=${ORG}`)).json();
  const item = lista.data.find((i) => i.id === cuerpo.integracion.id);
  assert.ok(item, 'aparece en la lista');
  assert.strictEqual(item.api_key_hash, undefined, 'GET no expone ni el hash');
  assert.strictEqual(item.apiKey, undefined, 'GET no repite la key');

  // Negación genuina: observador sin integracion.consultar no puede listar.
  const listaObs = await fetch(`${baseObs}/api/v1/integraciones?organizacionId=${ORG}`);
  assert.strictEqual(listaObs.status, 403);

  const [aud] = await sequelize.query(
    `SELECT count(*)::int n FROM auditoria_cambio WHERE entidad='integracion' AND accion='crear' AND entidad_id = :id`,
    { replacements: { id: cuerpo.integracion.id } });
  assert.strictEqual(aud[0].n, 1);
});

dbTest('PATCH /integraciones/:id rotar → observador 403 sin tocar hash; admin rota con auditoría', async () => {
  const [integ] = await sequelize.query(`SELECT * FROM integracion WHERE id = :id`, { replacements: { id: integracionId } });
  const rotarObs = await fetch(`${baseObs}/api/v1/integraciones/${integ[0].id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accion: 'rotar' }),
  });
  assert.strictEqual(rotarObs.status, 403, 'el usuario observador: sin integracion.gestionar');
  // y la key original sigue intacta en BD
  const [filas] = await sequelize.query('SELECT api_key_hash FROM integracion WHERE id = :id', { replacements: { id: integ[0].id } });
  assert.strictEqual(filas[0].api_key_hash, integ[0].api_key_hash);

  const rotar = await fetch(`${base}/api/v1/integraciones/${integ[0].id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accion: 'rotar' }),
  });
  assert.strictEqual(rotar.status, 200);
  const cuerpo = await rotar.json();
  assert.ok(cuerpo.apiKey && cuerpo.apiKey.length >= 40, 'nueva key entregada al rotar');
  const [filas2] = await sequelize.query('SELECT api_key_hash FROM integracion WHERE id = :id', { replacements: { id: integ[0].id } });
  assert.notStrictEqual(filas2[0].api_key_hash, integ[0].api_key_hash, 'hash distinto tras rotar');
  assert.strictEqual(filas2[0].api_key_hash.length, 64, 'solo sha256');
  const [aud] = await sequelize.query(
    `SELECT count(*)::int n FROM auditoria_cambio WHERE entidad='integracion' AND accion='rotar_clave' AND entidad_id = :id`,
    { replacements: { id: integ[0].id } });
  assert.strictEqual(aud[0].n, 1);
});

dbTest('GET /alertas filtra por org y nivel', async () => {
  const res = await fetch(`${baseObs}/api/v1/alertas?organizacionId=${ORG}&nivel=alerta`);
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.ok(body.data.every((a) => a.organizacion_id === ORG && a.nivel === 'alerta'));
  const malo = await fetch(`${baseObs}/api/v1/alertas?organizacionId=${ORG}&nivel=volando`);
  assert.strictEqual(malo.status, 400);
});
