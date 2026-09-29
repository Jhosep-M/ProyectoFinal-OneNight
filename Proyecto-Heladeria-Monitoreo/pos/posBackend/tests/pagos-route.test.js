'use strict';

/* Bloque 1 — Pagos sueltos: POST /payments solo concilia pagos de ventas
 * activas con turno abierto. Sin DB ni red real.
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
}));

jest.mock('../src/utils/audit', () => ({
  auditLog: jest.fn(),
}));

const request = require('supertest');
const { sequelize } = require('../src/config/database');
const { createApp } = require('../src/app');

const app = createApp();
const VENTA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const METODO = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const TURNO = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const body = { venta_id: VENTA, metodo_pago_id: METODO, monto: 10 };

function mockVenta(ventaRow, turnoRow) {
  sequelize.query.mockImplementation(async (sql) => {
    if (sql.includes('FROM venta')) return [[ventaRow].filter(Boolean)];
    if (sql.includes('FROM turno_caja')) return [[turnoRow].filter(Boolean)];
    if (sql.includes('INSERT INTO pago')) return [[{ id_pago: 'pay-1' }]];
    return [[]];
  });
}

describe('POST /api/v1/payments', () => {
  beforeEach(() => jest.clearAllMocks());

  test('venta activa + turno abierto -> 201', async () => {
    mockVenta({ id_venta: VENTA, estado: 'activa', turno_id: TURNO }, { estado: 'abierto' });
    const res = await request(app).post('/api/v1/payments').send(body);
    expect(res.status).toBe(201);
  });

  test('venta inexistente -> 404 sin insertar', async () => {
    mockVenta(null, null);
    const res = await request(app).post('/api/v1/payments').send(body);
    expect(res.status).toBe(404);
    expect(sequelize.query.mock.calls.some(([s]) => s.includes('INSERT INTO pago'))).toBe(false);
  });

  test('venta anulada -> 400 sin insertar', async () => {
    mockVenta({ id_venta: VENTA, estado: 'anulada', turno_id: TURNO }, { estado: 'cerrado' });
    const res = await request(app).post('/api/v1/payments').send(body);
    expect(res.status).toBe(400);
    expect(sequelize.query.mock.calls.some(([s]) => s.includes('INSERT INTO pago'))).toBe(false);
  });

  test('turno cerrado -> 400 sin insertar', async () => {
    mockVenta({ id_venta: VENTA, estado: 'activa', turno_id: TURNO }, { estado: 'cerrado' });
    const res = await request(app).post('/api/v1/payments').send(body);
    expect(res.status).toBe(400);
    expect(sequelize.query.mock.calls.some(([s]) => s.includes('INSERT INTO pago'))).toBe(false);
  });
});
