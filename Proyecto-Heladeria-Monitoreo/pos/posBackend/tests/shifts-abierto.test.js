'use strict';

/* Opción A mesero cobra: GET /shifts/abierto devuelve el turno abierto
 * más reciente de cualquier cajero. Exige venta.crear (no turno.consultar),
 * así el mesero (023) puede cobrar sin abrir caja propia.
 * Sin turno abierto -> 404 SIN_TURNO. Sin permiso -> 403.
 */

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key';

const mockPerms = new Set(['venta.crear']);

jest.mock('../src/config/database', () => ({
  sequelize: { query: jest.fn() },
}));

jest.mock('../src/middlewares/authenticate', () => ({
  authenticateJWT: (req, _res, next) => {
    req.user = { id: 'u-mesero-1' };
    next();
  },
}));

jest.mock('../src/middlewares/authorize', () => ({
  authorize: (permiso) => (_req, res, next) => {
    if (!mockPerms.has(permiso)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return next();
  },
  requirePermission: (permiso) => (_req, res, next) => {
    if (!mockPerms.has(permiso)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return next();
  },
  authorizeAny: (permisos) => (_req, res, next) => {
    const lista = Array.isArray(permisos) ? permisos : [permisos];
    if (!lista.some((p) => mockPerms.has(p))) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return next();
  },
}));

const request = require('supertest');
const { sequelize } = require('../src/config/database');
const { createApp } = require('../src/app');

const app = createApp();
const TURNO = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

describe('GET /api/v1/shifts/abierto (cobro mesero)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPerms.add('venta.crear');
  });

  test('devuelve el turno abierto más reciente con cajero -> 200', async () => {
    sequelize.query.mockResolvedValueOnce([[{ id_turno: TURNO, estado: 'abierto', cajero_email: 'caja@h.com' }]]);
    const res = await request(app).get('/api/v1/shifts/abierto');
    expect(res.status).toBe(200);
    expect(res.body.id_turno).toBe(TURNO);
    expect(res.body.cajero_email).toBe('caja@h.com');
    const sql = sequelize.query.mock.calls[0][0];
    expect(sql).toMatch(/estado\s*=\s*'abierto'/);
    expect(sql).toMatch(/ORDER BY.*fecha_apertura DESC LIMIT 1/s);
  });

  test('sin turno abierto -> 404 SIN_TURNO', async () => {
    sequelize.query.mockResolvedValueOnce([[]]);
    const res = await request(app).get('/api/v1/shifts/abierto');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('SIN_TURNO');
  });

  test('sin venta.crear -> 403', async () => {
    mockPerms.delete('venta.crear');
    const res = await request(app).get('/api/v1/shifts/abierto');
    expect(res.status).toBe(403);
    expect(sequelize.query).not.toHaveBeenCalled();
  });
});
