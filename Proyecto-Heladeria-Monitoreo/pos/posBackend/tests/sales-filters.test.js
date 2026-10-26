'use strict';

/* HU-14 — Historial: GET /sales acepta filtros opcionales
 * (desde/hasta/estado/cajero/método) con where dinámico parametrizado,
 * sin romper el listado sin filtros. Sin DB ni red real.
 */

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key';

jest.mock('../src/config/database', () => ({
  sequelize: { query: jest.fn() },
}));

jest.mock('../src/middlewares/authenticate', () => ({
  authenticateJWT: (req, _res, next) => {
    req.user = { id: 'u-test' };
    next();
  },
}));

jest.mock('../src/middlewares/authorize', () => ({
  authorize: () => (_req, _res, next) => next(),
  requirePermission: () => (_req, _res, next) => next(),
  authorizeAny: () => (_req, _res, next) => next(),
}));

jest.mock('../src/utils/audit', () => ({
  auditLog: jest.fn(),
}));

const request = require('supertest');
const { sequelize } = require('../src/config/database');
const { createApp } = require('../src/app');

const app = createApp();

function mockDb({ admin = true } = {}) {
  sequelize.query.mockImplementation(async (sql) => {
    if (sql.includes('usuario_tiene_permiso')) return [[{ admin }]];
    if (sql.includes('FROM venta')) return [[{ id_venta: 'v1', estado: 'activa' }]];
    return [[]];
  });
}

describe('GET /api/v1/sales (filtros HU-14)', () => {
  beforeEach(() => jest.clearAllMocks());

  test('sin filtros lista igual que antes -> 200', async () => {
    mockDb();
    const res = await request(app).get('/api/v1/sales');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id_venta: 'v1', estado: 'activa' }]);
  });

  test('filtra por estado y fecha con params parametrizados', async () => {
    mockDb();
    const res = await request(app).get('/api/v1/sales?estado=anulada&desde=2026-10-01&hasta=2026-10-31');
    expect(res.status).toBe(200);
    const ventaCall = sequelize.query.mock.calls.find(([sql]) => sql.includes('FROM venta'));
    const [sql, opts] = ventaCall;
    expect(sql).toMatch(/v\.estado = :estado/);
    expect(sql).toMatch(/v\.fecha >= :desde/);
    expect(sql).toMatch(/v\.fecha <= :hasta/);
    expect(opts.replacements.estado).toBe('anulada');
    // Sin interpolación: los valores viajan en replacements.
    expect(sql).not.toContain('2026-10-01');
  });

  test('filtra por método con EXISTS parametrizado', async () => {
    mockDb();
    const metodo = '55555555-5555-4555-8555-555555555555';
    const res = await request(app).get(`/api/v1/sales?metodo=${metodo}`);
    expect(res.status).toBe(200);
    const ventaCall = sequelize.query.mock.calls.find(([sql]) => sql.includes('FROM venta'));
    const [sql, opts] = ventaCall;
    expect(sql).toMatch(/EXISTS.*pago.*metodo_pago_id = :metodo/s);
    expect(opts.replacements.metodo).toBe(metodo);
  });

  test('estado inválido -> 400 humano', async () => {
    mockDb();
    const res = await request(app).get('/api/v1/sales?estado=raro');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/activa\|anulada/);
  });

  test('cajero sin permiso global solo ve sus turnos (ownership)', async () => {
    mockDb({ admin: false });
    const res = await request(app).get('/api/v1/sales');
    expect(res.status).toBe(200);
    const ventaCall = sequelize.query.mock.calls.find(([sql]) => sql.includes('FROM venta'));
    const [sql, opts] = ventaCall;
    expect(sql).toMatch(/JOIN turno_caja/);
    expect(sql).toMatch(/t\.usuario_id = :uid/);
    expect(opts.replacements.uid).toBe('u-test');
  });
});
