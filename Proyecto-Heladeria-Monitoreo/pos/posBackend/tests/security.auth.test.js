'use strict';

/* Seguridad / Auth: authenticateJWT + authorize. Sin DB ni red real. */

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key';

jest.mock('../src/config/database', () => ({
  sequelize: { query: jest.fn() },
}));

const mockGetUser = jest.fn();
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ auth: { getUser: mockGetUser } })),
}));

const { sequelize } = require('../src/config/database');
const { authenticateJWT } = require('../src/middlewares/authenticate');
const { authorize, requirePermission } = require('../src/middlewares/authorize');

function mockRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('authenticateJWT', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('sin header Authorization -> 401', async () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();
    await authenticateJWT(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  test('sin esquema Bearer -> 401', async () => {
    const req = { headers: { authorization: 'Basic abc123' } };
    const res = mockRes();
    await authenticateJWT(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('Bearer vacio -> 401', async () => {
    const req = { headers: { authorization: 'Bearer   ' } };
    const res = mockRes();
    await authenticateJWT(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('Bearer invalido (supabase error) -> 401 generico sin detail', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('invalid signature expired') });
    const req = { headers: { authorization: 'Bearer token-malo' }, body: {} };
    const res = mockRes();
    const next = jest.fn();
    await authenticateJWT(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    // No filtra el detail interno de supabase
    expect(JSON.stringify(res.json.mock.calls[0][0])).not.toMatch(/invalid signature/i);
    expect(next).not.toHaveBeenCalled();
  });

  test('token expirado -> 401 generico', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'Token expired', status: 401 } });
    const req = { headers: { authorization: 'Bearer expirado' } };
    const res = mockRes();
    await authenticateJWT(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
    expect(JSON.stringify(res.json.mock.calls[0][0])).not.toMatch(/expired/i);
  });

  test('token valido -> next() y req.user derivado del JWT, ignora userId del body', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: 'uid-jwt-1', email: 'caja@x.com' } },
      error: null,
    });
    const req = {
      headers: { authorization: 'Bearer token-ok' },
      body: { userId: 'uid-atacante', usuario_id: 'otro' },
    };
    const res = mockRes();
    const next = jest.fn();
    await authenticateJWT(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({ id: 'uid-jwt-1', email: 'caja@x.com' });
    expect(req.user.id).not.toBe('uid-atacante');
  });

  test('excepcion del cliente supabase -> 401 sin fugas', async () => {
    mockGetUser.mockRejectedValueOnce(new Error('boom secreto con stack'));
    const req = { headers: { authorization: 'Bearer x' } };
    const res = mockRes();
    await authenticateJWT(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
    expect(JSON.stringify(res.json.mock.calls[0][0])).not.toMatch(/boom|stack/i);
  });
});

describe('authorize / requirePermission', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('sin req.user -> 401', async () => {
    const mw = authorize('ventas.crear');
    const res = mockRes();
    const next = jest.fn();
    await mw({ user: undefined }, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('has_perm false -> 403 generico que NO filtra el nombre del permiso', async () => {
    sequelize.query.mockResolvedValueOnce([[{ has_perm: false }]]);
    const mw = authorize('permiso.super.secreto.xyz');
    const res = mockRes();
    const next = jest.fn();
    await mw({ user: { id: 'u1' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden' });
    const body = JSON.stringify(res.json.mock.calls[0][0]);
    expect(body).not.toMatch(/permiso\.super\.secreto\.xyz/);
    expect(next).not.toHaveBeenCalled();
  });

  test('has_perm true -> next()', async () => {
    sequelize.query.mockResolvedValueOnce([[{ has_perm: true }]]);
    const mw = authorize('ventas.crear');
    const res = mockRes();
    const next = jest.fn();
    await mw({ user: { id: 'u1' } }, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('requirePermission es alias de authorize y consulta parametrizada', async () => {
    sequelize.query.mockResolvedValueOnce([[{ has_perm: true }]]);
    const res = mockRes();
    const next = jest.fn();
    await requirePermission('caja.cerrar')({ user: { id: 'u9' } }, res, next);
    expect(next).toHaveBeenCalled();
    const [sql, opts] = sequelize.query.mock.calls[0];
    expect(sql).toMatch(/usuario_tiene_permiso/);
    // Parametrizada: el permiso viaja en replacements, no interpolado en el SQL
    expect(opts.replacements).toEqual({ uid: 'u9', perm: 'caja.cerrar' });
    expect(sql).not.toMatch(/caja\.cerrar/);
    expect(sql).not.toMatch(/u9/);
  });

  test('fallo de DB -> 500 generico sin detail', async () => {
    sequelize.query.mockRejectedValueOnce(new Error('relation "x" does not exist DETAIL secreto'));
    const res = mockRes();
    await authorize('ventas.crear')({ user: { id: 'u1' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
    expect(JSON.stringify(res.json.mock.calls[0][0])).not.toMatch(/relation|DETAIL|secreto/);
  });
});
