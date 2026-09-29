require('../helpers/env');
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { dbTest } = require('../helpers/env');

const ORG = '11111111-1111-4111-8111-111111111111';
const ADM = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OPE = 'bbbb0000-0000-4000-8000-000000000002';
let server; let base; let serverOpe; let baseOpe; let sequelize;

// Decisión de diseño T9-1 (revisión): el test necesita DOS identidades. El seed
// (Task 2, aprobado) da a `observador` solo 5 permisos consultar — sin NINGUNO
// de umbral/meta/tarifa/recomendacion — así que un solo observador haría 403 en
// 7/8 tests. ADMIN (admin_monitoreo, todos los permisos) corre los tests 1-4 y
// 6-8; OPERADOR (tiene umbral.consultar pero NO umbral.gestionar) corre el test
// RBAC: POST → 403 genuino, GET → 200 genuino.
async function arrancar(user) {
  const { testApp, listen } = require('../helpers/testApp');
  const { umbralesRouter } = require('../../src/routes/umbrales.routes');
  const { metasRouter } = require('../../src/routes/metas.routes');
  const { tarifasRouter } = require('../../src/routes/tarifas.routes');
  const { recomendacionesRouter } = require('../../src/routes/recomendaciones.routes');
  const app = testApp(user, [
    ['/api/v1/umbrales', umbralesRouter],
    ['/api/v1/metas', metasRouter],
    ['/api/v1/tarifas', tarifasRouter],
    ['/api/v1/recomendaciones', recomendacionesRouter],
  ]);
  return listen(app);
}

function post(url, body, b = base) {
  return fetch(`${b}${url}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
}

before(async () => {
  if (!process.env.MONITOREO_TEST_DATABASE_URL) return;
  ({ sequelize } = require('../../src/config/database'));
  await sequelize.authenticate();
  const fx = require('../helpers/fixtures');
  await fx.prepararSchema();
  await fx.seedUsuarioEnOrg(ADM, 'adm@test.local', 'admin_monitoreo');
  await fx.seedUsuarioEnOrg(OPE, 'ope@test.local', 'operador');
  ({ server, base } = await arrancar({ id: ADM, email: 'adm@test.local' }));
  ({ server: serverOpe, base: baseOpe } = await arrancar({ id: OPE, email: 'ope@test.local' }));
});
after(() => { server?.close(); serverOpe?.close(); return sequelize?.close(); });

dbTest('POST /umbrales rechaza solape con un umbral existente del seed (agua alerta 1000-1500)', async () => {
  const { TipoRecurso } = require('../../src/models');
  const agua = await TipoRecurso.findOne({ where: { codigo: 'agua' } });
  const res = await post('/api/v1/umbrales', {
    organizacionId: ORG, tipoRecursoId: agua.id, nombre: 'intruso', nivel: 'critico',
    limiteInferior: 1200, limiteSuperior: 1800,
  });
  assert.strictEqual(res.status, 400);
  assert.strictEqual((await res.json()).error, 'Rango solapado');
});

dbTest('POST /umbrales válido en recurso sin rangos → 201 + auditoría; lista filtrada por org', async () => {
  const { TipoRecurso } = require('../../src/models');
  const energia = await TipoRecurso.findOne({ where: { codigo: 'energia' } });
  const r1 = await post('/api/v1/umbrales', {
    organizacionId: ORG, tipoRecursoId: energia.id, nombre: 'energia normal', nivel: 'normal',
    limiteInferior: 0, limiteSuperior: 500,
  });
  assert.strictEqual(r1.status, 201);
  const umbral = await r1.json();

  const r2 = await post('/api/v1/umbrales', {
    organizacionId: ORG, tipoRecursoId: energia.id, nombre: 'energia alerta', nivel: 'alerta',
    limiteInferior: 500, limiteSuperior: 800,
  });
  assert.strictEqual(r2.status, 201, 'contiguo = permitido');

  const lista = await (await fetch(`${base}/api/v1/umbrales?organizacionId=${ORG}`)).json();
  assert.ok(lista.data.every((u) => u.organizacion_id === ORG));
  const [aud] = await sequelize.query(
    `SELECT count(*)::int n FROM auditoria_cambio WHERE entidad='umbral_clasificacion' AND accion='crear' AND entidad_id = :id`,
    { replacements: { id: umbral.id } });
  assert.strictEqual(aud[0].n, 1);
});

dbTest('POST /umbrales con limiteInferior >= limiteSuperior → 400', async () => {
  const { TipoRecurso } = require('../../src/models');
  const energia = await TipoRecurso.findOne({ where: { codigo: 'energia' } });
  const res = await post('/api/v1/umbrales', {
    organizacionId: ORG, tipoRecursoId: energia.id, nombre: 'invertido', nivel: 'normal',
    limiteInferior: 900, limiteSuperior: 100,
  });
  assert.strictEqual(res.status, 400);
});

dbTest('POST /umbrales con organizacionId ajena → 403 (aislamiento)', async () => {
  const res = await post('/api/v1/umbrales', {
    organizacionId: '99999999-9999-4999-8999-999999999999',
    tipoRecursoId: '11111111-1111-4111-8111-111111111111',
    nombre: 'x', nivel: 'normal', limiteInferior: 0, limiteSuperior: 10,
  });
  assert.strictEqual(res.status, 403);
});

dbTest('operador NO puede crear umbrales (403 RBAC) pero sí listarlos', async () => {
  // Decisión T9-1: operador tiene umbral.consultar pero no umbral.gestionar.
  const { TipoRecurso } = require('../../src/models');
  const agua = await TipoRecurso.findOne({ where: { codigo: 'agua' } });
  const crear = await post('/api/v1/umbrales', {
    organizacionId: ORG, tipoRecursoId: agua.id, nombre: 'de ope', nivel: 'normal',
    limiteInferior: 0, limiteSuperior: 10,
  }, baseOpe);
  assert.strictEqual(crear.status, 403);
  const listar = await fetch(`${baseOpe}/api/v1/umbrales?organizacionId=${ORG}`);
  assert.strictEqual(listar.status, 200);
});

dbTest('metas: porcentaje > 100 → 400; fechas invertidas → 400; válida → 201 + auditoría', async () => {
  const { TipoRecurso } = require('../../src/models');
  const agua = await TipoRecurso.findOne({ where: { codigo: 'agua' } });
  const baseMeta = {
    organizacionId: ORG, tipoRecursoId: agua.id, nombre: 'Meta Q4',
    porcentajeReduccion: 15, fechaInicio: '2026-10-01', fechaFin: '2026-12-31',
  };
  assert.strictEqual((await post('/api/v1/metas', { ...baseMeta, porcentajeReduccion: 101 })).status, 400);
  assert.strictEqual((await post('/api/v1/metas', { ...baseMeta, porcentajeReduccion: -1 })).status, 400);
  assert.strictEqual((await post('/api/v1/metas', { ...baseMeta, fechaInicio: '2026-12-31', fechaFin: '2026-10-01' })).status, 400);
  const okRes = await post('/api/v1/metas', baseMeta);
  assert.strictEqual(okRes.status, 201);
  const meta = await okRes.json();
  const [aud] = await sequelize.query(
    `SELECT count(*)::int n FROM auditoria_cambio WHERE entidad='meta_reduccion' AND accion='crear' AND entidad_id = :id`,
    { replacements: { id: meta.id } });
  assert.strictEqual(aud[0].n, 1);
});

dbTest('tarifas: período solapado → 400; contiguo válido → 201 + auditoría', async () => {
  const { TipoRecurso } = require('../../src/models');
  const agua = await TipoRecurso.findOne({ where: { codigo: 'agua' } });
  const t1 = await post('/api/v1/tarifas', {
    organizacionId: ORG, tipoRecursoId: agua.id, nombre: 'Tarifa enero',
    monto: 0.05, unidad: 'litro', fechaInicio: '2026-01-01', fechaFin: '2026-01-31',
  });
  assert.strictEqual(t1.status, 201);

  const solapada = await post('/api/v1/tarifas', {
    organizacionId: ORG, tipoRecursoId: agua.id, nombre: 'Tarifa enero-mzo',
    monto: 0.06, unidad: 'litro', fechaInicio: '2026-01-20', fechaFin: '2026-03-31',
  });
  assert.strictEqual(solapada.status, 400);
  assert.strictEqual((await solapada.json()).error, 'Período solapado');

  const contigua = await post('/api/v1/tarifas', {
    organizacionId: ORG, tipoRecursoId: agua.id, nombre: 'Tarifa febrero',
    monto: 0.06, unidad: 'litro', fechaInicio: '2026-02-01', fechaFin: '2026-02-28',
  });
  assert.strictEqual(contigua.status, 201);
  const tarifa = await contigua.json();
  const [aud] = await sequelize.query(
    `SELECT count(*)::int n FROM auditoria_cambio WHERE entidad='tarifa' AND accion='crear' AND entidad_id = :id`,
    { replacements: { id: tarifa.id } });
  assert.strictEqual(aud[0].n, 1);

  const negativa = await post('/api/v1/tarifas', {
    organizacionId: ORG, tipoRecursoId: agua.id, nombre: 'negativa',
    monto: -1, unidad: 'litro', fechaInicio: '2026-03-01', fechaFin: '2026-03-31',
  });
  assert.strictEqual(negativa.status, 400, 'monto >= 0');
});

dbTest('recomendaciones: crear y cambiar estado audita', async () => {
  const crear = await post('/api/v1/recomendaciones', {
    organizacionId: ORG, titulo: 'Revisar fugas', descripcion: 'Inspeccionar línea principal',
    prioridad: 'alta',
  });
  assert.strictEqual(crear.status, 201);
  const rec = await crear.json();

  const patch = await fetch(`${base}/api/v1/recomendaciones/${rec.id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado: 'aplicada' }),
  });
  assert.strictEqual(patch.status, 200);
  const [aud] = await sequelize.query(
    `SELECT count(*)::int n FROM auditoria_cambio WHERE entidad='recomendacion' AND entidad_id = :id AND accion='actualizar'`,
    { replacements: { id: rec.id } });
  assert.strictEqual(aud[0].n, 1);

  const invalido = await fetch(`${base}/api/v1/recomendaciones/${rec.id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado: 'volando' }),
  });
  assert.strictEqual(invalido.status, 400, 'estado controlado');
});
