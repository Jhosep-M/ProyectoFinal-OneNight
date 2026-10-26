'use strict';

/* Espejo de venta directa: POST /orders con origen='venta_directa' + venta_id
 * enlaza venta.pedido_id (solo si la venta aún no tiene pedido).
 * Sin venta_id no toca la tabla venta.
 */

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key';

jest.mock('../src/config/database', () => ({
  sequelize: { query: jest.fn(), transaction: jest.fn((cb) => cb({})) },
}));

jest.mock('../src/middlewares/authenticate', () => ({
  authenticateJWT: (req, _res, next) => {
    req.user = { id: 'u-caja-1' };
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
const PEDIDO = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const PROD = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const VENTA = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

function mockBase() {
  sequelize.query.mockImplementation(async (sql) => {
    if (sql.includes('INSERT INTO pedido')) {
      return [[{ id_pedido: PEDIDO, estado: 'abierto', origen: 'venta_directa' }]];
    }
    if (sql.includes('SELECT precio FROM producto')) return [[{ precio: 10 }]];
    if (sql.includes('INSERT INTO detalle_pedido')) return [[]];
    if (sql.includes('UPDATE venta SET pedido_id')) return [[]];
    if (sql.includes('FROM detalle_pedido')) {
      return [[{ cantidad: 1, precio_unitario: 10, subtotal: 10 }]];
    }
    return [[]];
  });
}

describe("POST /orders espejo venta_directa", () => {
  beforeEach(() => jest.clearAllMocks());

  test('con venta_id enlaza venta.pedido_id (con guard IS NULL) -> 201', async () => {
    mockBase();
    const res = await request(app).post('/api/v1/orders').send({
      mesa_id: null,
      origen: 'venta_directa',
      venta_id: VENTA,
      items: [{ producto_id: PROD, cantidad: 1 }],
    });
    expect(res.status).toBe(201);
    const link = sequelize.query.mock.calls.find(([s]) => s.includes('UPDATE venta SET pedido_id'));
    expect(link).toBeDefined();
    expect(link[0]).toMatch(/pedido_id IS NULL/);
    expect(link[1].replacements.pedido).toBe(PEDIDO);
    expect(link[1].replacements.venta).toBe(VENTA);
  });

  test('sin venta_id no toca la tabla venta -> 201', async () => {
    mockBase();
    const res = await request(app).post('/api/v1/orders').send({
      mesa_id: null,
      origen: 'mostrador',
      items: [{ producto_id: PROD, cantidad: 1 }],
    });
    expect(res.status).toBe(201);
    expect(sequelize.query.mock.calls.some(([s]) => s.includes('UPDATE venta SET pedido_id'))).toBe(false);
  });

  test('venta_id no-uuid -> 400 sin INSERT', async () => {
    const res = await request(app).post('/api/v1/orders').send({
      mesa_id: null,
      origen: 'venta_directa',
      venta_id: 'no-es-uuid',
      items: [{ producto_id: PROD, cantidad: 1 }],
    });
    expect(res.status).toBe(400);
    expect(sequelize.query).not.toHaveBeenCalled();
  });
});
