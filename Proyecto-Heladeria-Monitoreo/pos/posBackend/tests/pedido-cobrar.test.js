'use strict';

/* Bloque 1 — Cobrar pedido: POST /orders/:id/cobrar convierte un pedido
 * abierto en venta (reutiliza registrar_venta: valida stock con FOR UPDATE)
 * y cierra el pedido. Sin DB ni red real.
 */

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key';

jest.mock('../src/config/database', () => ({
  sequelize: { query: jest.fn(), transaction: jest.fn((cb) => cb({})) },
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
const PEDIDO = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const TURNO = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const METODO = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const PROD = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

function mockExito() {
  sequelize.query.mockImplementation(async (sql) => {
    if (sql.includes('FROM pedido')) return [[{ id_pedido: PEDIDO, estado: 'abierto' }]];
    if (sql.includes('FROM detalle_pedido')) {
      return [[{ producto_id: PROD, cantidad: 2, precio_unitario: 10 }]];
    }
    if (sql.includes('registrar_venta')) return [[{ venta_id: 'v-9' }]];
    return [[{ id_pedido: PEDIDO, estado: 'cerrado' }]];
  });
}

describe('POST /api/v1/orders/:id/cobrar', () => {
  beforeEach(() => jest.clearAllMocks());

  test('convierte pedido abierto en venta y lo cierra -> 201', async () => {
    mockExito();
    const res = await request(app).post(`/api/v1/orders/${PEDIDO}/cobrar`).send({
      turno_id: TURNO,
      pagos: [{ metodo_pago_id: METODO, monto: 20 }],
    });
    expect(res.status).toBe(201);
    expect(res.body.venta_id).toBe('v-9');
    const registrar = sequelize.query.mock.calls.find(([s]) => s.includes('registrar_venta'));
    expect(registrar).toBeDefined();
    const link = sequelize.query.mock.calls.find(([s]) => s.includes('SET pedido_id'));
    expect(link).toBeDefined();
    const cierra = sequelize.query.mock.calls.find(([s]) => s.includes("estado='cerrado'"));
    expect(cierra).toBeDefined();
  });

  test('pedido ya cerrado -> 409 sin crear venta', async () => {
    sequelize.query.mockImplementation(async (sql) => {
      if (sql.includes('FROM pedido')) return [[{ id_pedido: PEDIDO, estado: 'cerrado' }]];
      return [[]];
    });
    const res = await request(app).post(`/api/v1/orders/${PEDIDO}/cobrar`).send({
      turno_id: TURNO,
      pagos: [{ metodo_pago_id: METODO, monto: 20 }],
    });
    expect(res.status).toBe(409);
    expect(sequelize.query.mock.calls.some(([s]) => s.includes('registrar_venta'))).toBe(false);
  });

  test('pedido inexistente -> 404', async () => {
    sequelize.query.mockImplementation(async () => [[]]);
    const res = await request(app).post(`/api/v1/orders/${PEDIDO}/cobrar`).send({
      turno_id: TURNO,
      pagos: [{ metodo_pago_id: METODO, monto: 20 }],
    });
    expect(res.status).toBe(404);
  });

  test('sin pagos -> 400', async () => {
    const res = await request(app).post(`/api/v1/orders/${PEDIDO}/cobrar`).send({ turno_id: TURNO, pagos: [] });
    expect(res.status).toBe(400);
    expect(sequelize.query).not.toHaveBeenCalled();
  });
});
