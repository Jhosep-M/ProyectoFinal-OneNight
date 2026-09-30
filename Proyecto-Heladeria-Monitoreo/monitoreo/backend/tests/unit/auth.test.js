require('../helpers/env');
const { test } = require('node:test');
const assert = require('node:assert');

test('authenticateJWT sin header → 401 { error }', async () => {
  const { authenticateJWT } = require('../../src/middlewares/auth.middleware');
  const req = { headers: {} };
  let status; let body;
  const res = { status(s) { status = s; return this; }, json(b) { body = b; return this; } };
  await authenticateJWT(req, res, () => { throw new Error('no debe llamar next'); });
  assert.strictEqual(status, 401);
  assert.ok(body.error);
});

test('authenticateJWT con token inválido → 401 (sin filtrar detalles sensibles)', async () => {
  const { authenticateJWT } = require('../../src/middlewares/auth.middleware');
  const req = { headers: { authorization: 'Bearer token-basura' } };
  let status; let body;
  const res = { status(s) { status = s; return this; }, json(b) { body = b; return this; } };
  await authenticateJWT(req, res, () => { throw new Error('no debe llamar next'); });
  assert.strictEqual(status, 401);
  assert.ok(!JSON.stringify(body).includes('password'));
});

test('requirePermission sin usuario → 401', async () => {
  const { requirePermission } = require('../../src/middlewares/rbac.middleware');
  let status;
  const res = { status(s) { status = s; return this; }, json() { return this; } };
  await requirePermission('x')({}, res, () => { throw new Error('no debe llamar next'); });
  assert.strictEqual(status, 401);
});

test('validateBody rechaza payload inválido con 400 y detalle por campo', async () => {
  const { z } = require('zod');
  const { validateBody } = require('../../src/middlewares/validation.middleware');
  const schema = z.object({ cantidad: z.number().positive(), nombre: z.string().min(1) });
  const req = { body: { cantidad: -5, nombre: '' } };
  let status; let body;
  const res = { status(s) { status = s; return this; }, json(b) { body = b; return this; } };
  validateBody(schema)(req, res, () => { throw new Error('no debe llamar next'); });
  assert.strictEqual(status, 400);
  assert.strictEqual(body.error, 'Payload inválido');
  assert.ok(body.detail.length >= 2);
  assert.ok(body.detail.every((i) => i.path && i.message));
});

test('validateBody elimina campos extra (strip)', async () => {
  const { z } = require('zod');
  const { validateBody } = require('../../src/middlewares/validation.middleware');
  const schema = z.object({ nombre: z.string() });
  const req = { body: { nombre: 'ok', campo_inyectado: 'x' } };
  let nextLlamado = false;
  const res = { status() { return this; }, json() { return this; } };
  validateBody(schema)(req, res, () => { nextLlamado = true; });
  assert.strictEqual(nextLlamado, true);
  assert.strictEqual(req.body.campo_inyectado, undefined);
  assert.strictEqual(req.body.nombre, 'ok');
});

test('scopeOrg rechaza organización ajena con 403 (aislamiento de tenant)', async () => {
  const { scopeOrg } = require('../../src/middlewares/rbac.middleware');
  const req = { orgIds: ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'], query: { organizacionId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' } };
  let status;
  const res = { status(s) { status = s; return this; }, json() { return this; } };
  scopeOrg(req, res, () => { throw new Error('no debe llamar next'); });
  assert.strictEqual(status, 403);
});

test('scopeOrg sin query ni body → 400 OrganizacionId requerido (sin fallback silencioso)', () => {
  const { scopeOrg } = require('../../src/middlewares/rbac.middleware');
  const req = { orgIds: ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'], query: {}, method: 'GET' };
  let status; let body;
  const res = { status(s) { status = s; return this; }, json(b) { body = b; return this; } };
  scopeOrg(req, res, () => { throw new Error('no debe llamar next'); });
  assert.strictEqual(status, 400);
  assert.strictEqual(body.error, 'OrganizacionId requerido');
});

test('scopeOrg POST con organizacionId en body válido → next (compat escrituras)', () => {
  const { scopeOrg } = require('../../src/middlewares/rbac.middleware');
  const req = { orgIds: ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'], query: {}, body: { organizacionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }, method: 'POST' };
  let nextLlamado = false;
  const res = { status() { return this; }, json() { return this; } };
  scopeOrg(req, res, () => { nextLlamado = true; });
  assert.strictEqual(nextLlamado, true);
  assert.strictEqual(req.organizacionId, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
});

test('scopeOrg ruta :id sin query deja pasar (el controller valida membership)', () => {
  const { scopeOrg } = require('../../src/middlewares/rbac.middleware');
  const req = { orgIds: ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'], query: {}, params: { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' } };
  let nextLlamado = false;
  const res = { status() { return this; }, json() { return this; } };
  scopeOrg(req, res, () => { nextLlamado = true; });
  assert.strictEqual(nextLlamado, true);
});
