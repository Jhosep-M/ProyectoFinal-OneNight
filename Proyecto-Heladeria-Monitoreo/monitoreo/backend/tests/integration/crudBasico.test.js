require('../helpers/env');
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');
const { dbTest } = require('../helpers/env');

const ADMIN = '77777777-7777-4777-8777-777777777777';
const ORG = '11111111-1111-4111-8111-111111111111';
let server; let base; let sequelize;

async function arrancar() {
  const { testApp, listen } = require('../helpers/testApp');
  const { organizacionesRouter } = require('../../src/routes/organizaciones.routes');
  const { medidoresRouter } = require('../../src/routes/medidores.routes');
  const { recursosRouter } = require('../../src/routes/recursos.routes');
  const { usuariosRouter } = require('../../src/routes/usuarios.routes');
  const { usuariosOrganizacionRouter } = require('../../src/routes/usuariosOrganizacion.routes');
  const app = testApp({ id: ADMIN, email: 'adm@test.local' }, [
    ['/api/v1/organizaciones', organizacionesRouter],
    ['/api/v1/medidores', medidoresRouter],
    ['/api/v1/recursos', recursosRouter],
    ['/api/v1/usuarios', usuariosRouter],
    ['/api/v1/usuarios-organizacion', usuariosOrganizacionRouter],
  ]);
  const l = await listen(app);
  server = l.server; base = l.base;
}

before(async () => {
  if (!process.env.MONITOREO_TEST_DATABASE_URL) return;
  ({ sequelize } = require('../../src/config/database'));
  await sequelize.authenticate();
  await require('../helpers/fixtures').prepararSchema();
  await require('../helpers/fixtures').seedUsuarioEnOrg(ADMIN, 'adm@test.local', 'admin_monitoreo');
  await arrancar();
});
after(() => { server?.close(); return sequelize?.close(); });

dbTest('GET /organizaciones solo devuelve las orgs del membership (aislamiento)', async () => {
  const res = await fetch(`${base}/api/v1/organizaciones`);
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body.data));
  assert.ok(body.data.every((o) => [ORG].includes(o.id)), 'no debe filtrar orgs ajenas');
  assert.strictEqual(body.data.length, 1);
});

dbTest('POST /organizaciones crea y audita', async () => {
  const res = await fetch(`${base}/api/v1/organizaciones`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre: 'Sucursal Sur', nit: 'SUR-2' }),
  });
  assert.strictEqual(res.status, 201);
  const org = await res.json();
  assert.ok(org.id);
  const { sequelize: sq } = require('../../src/config/database');
  const [aud] = await sq.query(`SELECT count(*)::int n FROM auditoria_cambio WHERE entidad='organizacion' AND accion='crear' AND entidad_id = :id`, { replacements: { id: org.id } });
  assert.strictEqual(aud[0].n, 1, 'escritura audita');
});

dbTest('el creador ve su nueva org — auto-membresía (decisión T5)', async () => {
  // Sin auto-membresía la org creada sería invisible hasta para su creador
  // (visibilidad = membresía). Corre tras 'POST /organizaciones crea y audita'.
  const res = await fetch(`${base}/api/v1/organizaciones`);
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  const creada = body.data.find((o) => o.nombre === 'Sucursal Sur');
  assert.ok(creada, 'la org creada debe ser visible para su creador');
});

dbTest('POST /medidores con código repetido → 409', async () => {
  const { TipoRecurso } = require('../../src/models');
  const tr = await TipoRecurso.findOne({ where: { codigo: 'agua' } });
  const payload = { organizacionId: ORG, tipoRecursoId: tr.id, codigoMedidor: 'MED-DUP-01', nombre: 'Uno' };
  const r1 = await fetch(`${base}/api/v1/medidores`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  assert.strictEqual(r1.status, 201);
  const r2 = await fetch(`${base}/api/v1/medidores`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, nombre: 'Dos' }) });
  assert.strictEqual(r2.status, 409, 'codigo_medidor UNIQUE');
});

dbTest('DELETE /medidores borra físico sin usos; con consumos → 409', async () => {
  const { TipoRecurso } = require('../../src/models');
  const { sequelize: sq } = require('../../src/config/database');
  const tr = await TipoRecurso.findOne({ where: { codigo: 'agua' } });
  const crear = (codigo) => fetch(`${base}/api/v1/medidores`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ organizacionId: ORG, tipoRecursoId: tr.id, codigoMedidor: codigo, nombre: codigo }),
  }).then((r) => r.json());
  // Sin usos: borrado físico (desaparece del listado).
  const m1 = await crear('MED-DEL-01');
  const del = await fetch(`${base}/api/v1/medidores/${m1.id}`, { method: 'DELETE' });
  assert.strictEqual(del.status, 200);
  const [gone] = await sq.query(`SELECT count(*)::int n FROM punto_medicion WHERE id = :id`, { replacements: { id: m1.id } });
  assert.strictEqual(gone[0].n, 0, 'borrado físico, no inactivación');
  // Con consumos: 409 y la fila sobrevive.
  const m2 = await crear('MED-DEL-02');
  await sq.query(
    `INSERT INTO recepcion_consumo_pos (consumo_externo_id, idempotency_key, organizacion_id, punto_medicion_id, tipo_recurso, cantidad, unidad_medida, fecha_consumo, origen)
     VALUES (:e, :k, :org, :med, 'agua', 10, 'litros', now(), 'POS')`,
    { replacements: { e: crypto.randomUUID(), k: crypto.randomUUID(), org: ORG, med: m2.id } },
  );
  const del2 = await fetch(`${base}/api/v1/medidores/${m2.id}`, { method: 'DELETE' });
  assert.strictEqual(del2.status, 409, 'con consumos asociados no se borra');
});

dbTest('GET /medidores de una org ajena → 403 (scopeOrg)', async () => {
  const otraOrg = '99999999-9999-4999-8999-999999999999';
  const res = await fetch(`${base}/api/v1/medidores?organizacionId=${otraOrg}`);
  assert.strictEqual(res.status, 403);
});

dbTest('POST /usuarios-organizacion asigna rol y audita; PATCH lo inactiva sin borrar', async () => {
  const { Rol } = require('../../src/models');
  const rolObs = await Rol.findOne({ where: { nombre: 'observador' } });
  const nuevo = '88888888-8888-4888-8888-888888888888';
  const res = await fetch(`${base}/api/v1/usuarios-organizacion`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuarioId: nuevo, email: 'nuevo@test.local', organizacionId: ORG, rolId: rolObs.id }),
  });
  assert.strictEqual(res.status, 201);
  const membresia = await res.json();
  assert.ok(membresia.id);

  const r2 = await fetch(`${base}/api/v1/usuarios-organizacion/${membresia.id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado: 'inactivo' }),
  });
  assert.strictEqual(r2.status, 200);
  const { sequelize: sq } = require('../../src/config/database');
  const [cnt] = await sq.query('SELECT count(*)::int n FROM usuario_organizacion WHERE id = :id', { replacements: { id: membresia.id } });
  assert.strictEqual(cnt[0].n, 1, 'sin borrado físico');
});

dbTest('GET /recursos devuelve agua y energía', async () => {
  const res = await fetch(`${base}/api/v1/recursos`);
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  const codigos = body.data.map((r) => r.codigo).sort();
  assert.deepStrictEqual(codigos, ['agua', 'energia']);
});
