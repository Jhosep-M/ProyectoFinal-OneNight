'use strict';

/* HU-25 — Export: GET /reports/export?desde&hasta&formato=csv solo admin/supervisor.
 * CSV + Content-Disposition + auditLog reporte.exportar. Sin DB real.
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
const { auditLog } = require('../src/utils/audit');
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

describe('GET /api/v1/reports/export', () => {
  beforeEach(() => jest.clearAllMocks());

  test('200 CSV + Content-Disposition + auditLog reporte.exportar', async () => {
    mockDb({ admin: true });
    const res = await request(app).get('/api/v1/reports/export?desde=2026-10-01&hasta=2026-10-31&formato=csv');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.headers['content-disposition']).toMatch(/attachment/);
    expect(res.text).toContain('seccion,clave,cantidad,total');
    expect(res.text).toContain('Efectivo');
    expect(auditLog).toHaveBeenCalledWith(expect.objectContaining({
      accion: 'reporte.exportar',
      entidad: 'reporte',
      resultado: 'exito',
    }));
  });

  test('403 si no tiene turno.consultar.todos', async () => {
    mockDb({ admin: false });
    const res = await request(app).get('/api/v1/reports/export?desde=2026-10-01');
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/permiso/i);
    expect(auditLog).not.toHaveBeenCalled();
  });

  test('400 fecha inválida y formato inválido, sin stack', async () => {
    mockDb({ admin: true });
    const r1 = await request(app).get('/api/v1/reports/export?desde=no-fecha');
    expect(r1.status).toBe(400);
    expect(r1.body.error).toMatch(/fecha válida/);
    expect(r1.body.stack).toBeUndefined();
    const r2 = await request(app).get('/api/v1/reports/export?formato=xlsx');
    expect(r2.status).toBe(400);
    expect(r2.body.error).toMatch(/formato debe ser csv/);
  });
});
