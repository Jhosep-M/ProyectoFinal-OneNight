require('../helpers/env');
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { dbTest } = require('../helpers/env');

let sequelize; let repositorio;

before(async () => {
  if (!process.env.MONITOREO_TEST_DATABASE_URL) return;
  ({ sequelize } = require('../../src/config/database'));
  await sequelize.authenticate();
  const helpers = require('../helpers/fixtures');
  await helpers.prepararSchema(); // drop/create monitoreo_test + DDL + seed
  repositorio = require('../../src/repositories/usuarios.repository');
});

after(async () => { if (sequelize) await sequelize.close(); });

dbTest('getPerfil crea el usuario la primera vez y no duplica en la segunda', async () => {
  const { getPerfil } = require('../../src/services/auth.service');
  const { Usuario } = require('../../src/models');
  const id = '22222222-2222-4222-8222-222222222222';

  const p1 = await getPerfil(id, 'persona3@test.local', 'Persona 3');
  assert.strictEqual(p1.id, id);
  assert.strictEqual(p1.organizaciones.length, 0, 'sin membresías asignadas aún');

  await getPerfil(id, 'persona3@test.local', 'Persona 3');
  assert.strictEqual(await Usuario.count({ where: { id } }), 1, 'upsert no debe duplicar');
});

dbTest('getPerfil devuelve membresías activas con rol y permisos', async () => {
  const { getPerfil } = require('../../src/services/auth.service');
  const { seedUsuarioEnOrg } = require('../helpers/fixtures');
  const id = '33333333-3333-4333-8333-333333333333';
  await seedUsuarioEnOrg(id, 'admin@test.local', 'admin_monitoreo');

  const perfil = await getPerfil(id, 'admin@test.local');
  assert.strictEqual(perfil.organizaciones.length, 1);
  const org = perfil.organizaciones[0];
  assert.strictEqual(org.rol, 'admin_monitoreo');
  assert.ok(org.permisos.includes('reporte.consultar'), 'admin debe tener todos los permisos');
  assert.ok(org.permisos.includes('umbral.gestionar'));
});

dbTest('requirePermission concede y deniega según el rol (consultas reales)', async () => {
  const { requirePermission } = require('../../src/middlewares/rbac.middleware');
  const { seedUsuarioEnOrg } = require('../helpers/fixtures');
  const adminId = '44444444-4444-4444-8444-444444444444';
  const obsId = '55555555-5555-4555-8555-555555555555';
  await seedUsuarioEnOrg(adminId, 'adm2@test.local', 'admin_monitoreo');
  await seedUsuarioEnOrg(obsId, 'obs@test.local', 'observador');

  let ok = false;
  await requirePermission('umbral.gestionar')(
    { user: { id: adminId, email: 'adm2@test.local' } },
    { status() { return this; }, json() { return this; } },
    () => { ok = true; },
  );
  assert.strictEqual(ok, true, 'admin_monitoreo tiene umbral.gestionar');

  let status;
  await requirePermission('umbral.gestionar')(
    { user: { id: obsId, email: 'obs@test.local' } },
    { status(s) { status = s; return this; }, json() { return this; } },
    () => { throw new Error('observador no debe pasar'); },
  );
  assert.strictEqual(status, 403);
});

dbTest('GET /auth/me sube el usuario con JWT inyectado', async () => {
  const { testApp, listen } = require('../helpers/testApp');
  const { authRouter } = require('../../src/routes/auth.routes');
  const id = '66666666-6666-4666-8666-666666666666';
  const app = testApp({ id, email: 'me@test.local' }, [['/api/v1/auth', authRouter]]);
  const { server, base } = await listen(app);
  try {
    const res = await fetch(`${base}/api/v1/auth/me`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.id, id);
    assert.ok(Array.isArray(body.organizaciones));
  } finally { server.close(); }
});
