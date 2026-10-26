'use strict';

/* HU-10 — Reportes: GET /reports/cierre agrega por método (SUM GROUP BY
 * parametrizado) y por turno, con rango de fechas opcional. Sin DB real.
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
    if (sql.includes('GROUP BY mp.nombre')) {
      return [[{ metodo: 'Efectivo', total: 100, pagos: 2 }]];
    }
    if (sql.includes('GROUP BY v.turno_id')) {
      return [[{ turno_id: 't1', ventas: 3, total: 150 }]];
    }
    if (sql.includes('FROM detalle_venta dv')) {
      return [[{ producto_id: 'p1', producto: 'Helado Vainilla', cantidad: 5, total: 125 }]];
    }
    if (sql.includes('AS monto')) {
      return [[{ ventas: 3, monto: 150 }]];
    }
    return [[]];
  });
}

describe('GET /api/v1/reports/cierre', () => {
  beforeEach(() => jest.clearAllMocks());

  test('cierre con rango agrega totales + por método + por turno', async () => {
    mockDb();
    const res = await request(app).get('/api/v1/reports/cierre?desde=2026-10-01&hasta=2026-10-31');
    expect(res.status).toBe(200);
    expect(res.body.totalVentas).toBe(3);
    expect(res.body.montoTotal).toBe(150);
    expect(res.body.porMetodo).toEqual([{ metodo: 'Efectivo', total: 100, pagos: 2 }]);
    expect(res.body.porTurno).toEqual([{ turno_id: 't1', ventas: 3, total: 150 }]);
    expect(res.body.topProductos).toEqual([
      { producto_id: 'p1', producto: 'Helado Vainilla', cantidad: 5, total: 125 },
    ]);
  });

  test('GROUP BY por método usa SUM parametrizado (sin interpolación)', async () => {
    mockDb();
    await request(app).get('/api/v1/reports/cierre?desde=2026-10-01');
    const metodoCall = sequelize.query.mock.calls.find(([sql]) => sql.includes('GROUP BY mp.nombre'));
    const [sql, opts] = metodoCall;
    expect(sql).toMatch(/SUM\(p\.monto\)/);
    expect(sql).toMatch(/v\.fecha >= :desde/);
    expect(opts.replacements.desde).toBe('2026-10-01');
    expect(sql).not.toContain('2026-10-01');
  });

  test('fecha inválida -> 400 humano', async () => {
    mockDb();
    const res = await request(app).get('/api/v1/reports/cierre?desde=no-fecha');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/fecha válida/);
  });

  test('cajero sin permiso global queda restringido a sus turnos', async () => {
    mockDb({ admin: false });
    await request(app).get('/api/v1/reports/cierre');
    const totalCall = sequelize.query.mock.calls.find(([sql]) => sql.includes('SUM(v.total)'));
    const [sql, opts] = totalCall;
    expect(sql).toMatch(/t\.usuario_id = :uid/);
    expect(opts.replacements.uid).toBe('u-test');
  });
});
