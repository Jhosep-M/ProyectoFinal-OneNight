'use strict';

/* HU-11 Mesero: verifica que mesero puede GET/POST pedidos pero NO cobrar.
 * Cobrar exige venta.crear (solo cajero/supervisor/admin) -> 403.
 * Tambien verifica mesero_id siempre sale del JWT, no del body.
 */

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key';

// Opción A (023-mesero-cobra): mesero cobra sobre turno de caja.
const mockMeseroPerms = new Set(['pedido.consultar', 'pedido.crear', 'mesa.consultar', 'producto.consultar', 'venta.crear', 'pago.consultar']);

jest.mock('../src/config/database', () => ({
  sequelize: { query: jest.fn(), transaction: jest.fn((cb) => cb({})) },
}));

jest.mock('../src/middlewares/authenticate', () => ({
  authenticateJWT: (req, _res, next) => {
    req.user = { id: 'u-mesero-1' };
    next();
  },
}));

jest.mock('../src/middlewares/authorize', () => ({
  authorize: (permiso) => (req, res, next) => {
    if (!mockMeseroPerms.has(permiso)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return next();
  },
  requirePermission: (permiso) => (req, res, next) => {
    if (!mockMeseroPerms.has(permiso)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return next();
  },
  authorizeAny: (permisos) => (req, res, next) => {
    const lista = Array.isArray(permisos) ? permisos : [permisos];
    if (!lista.some((p) => mockMeseroPerms.has(p))) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return next();
  },
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
const TURNO = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const METODO = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

describe('HU-11 mesero: opera pedidos y cobra en turno de caja (023)', () => {
  beforeEach(() => jest.clearAllMocks());

  test('GET /orders -> 200 con permiso pedido.consultar', async () => {
    sequelize.query.mockResolvedValueOnce([[]]);
    const res = await request(app).get('/api/v1/orders');
    expect(res.status).toBe(200);
  });

  test('POST /orders -> 201 y mesero_id sale del JWT aunque el body traiga otro', async () => {
    sequelize.query.mockImplementation(async (sql) => {
      if (sql.includes('INSERT INTO pedido')) {
        return [[{ id_pedido: PEDIDO, estado: 'abierto', mesero_id: 'u-mesero-1' }]];
      }
      if (sql.includes('SELECT precio FROM producto')) {
        return [[{ precio: 10 }]];
      }
      if (sql.includes('INSERT INTO detalle_pedido')) return [[]];
      if (sql.includes('FROM detalle_pedido')) {
        return [[{ cantidad: 1, precio_unitario: 10, subtotal: 10 }]];
      }
      return [[]];
    });
    const res = await request(app).post('/api/v1/orders').send({
      mesa_id: null,
      mesero_id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
      items: [{ producto_id: PROD, cantidad: 1 }],
    });
    expect(res.status).toBe(201);
    const insertPedido = sequelize.query.mock.calls.find(([s]) => s.includes('INSERT INTO pedido'));
    expect(insertPedido).toBeDefined();
    expect(insertPedido[1].replacements.mesero).toBe('u-mesero-1');
    expect(insertPedido[1].replacements.mesero).not.toBe('ffffffff-ffff-4fff-8fff-ffffffffffff');
  });

  test('POST /orders/:id/cobrar -> 201 para mesero en turno de caja (con venta.crear)', async () => {
    sequelize.query.mockImplementation(async (sql) => {
      if (sql.includes('FROM pedido')) return [[{ id_pedido: PEDIDO, estado: 'abierto', mesa_id: null }]];
      if (sql.includes('FROM detalle_pedido')) return [[{ producto_id: PROD, cantidad: 2, precio_unitario: 10 }]];
      if (sql.includes('registrar_venta')) return [[{ venta_id: 'v-9' }]];
      if (sql.includes("estado='cerrado'")) return [[{ id_pedido: PEDIDO, estado: 'cerrado' }]];
      return [[]];
    });
    const res = await request(app).post(`/api/v1/orders/${PEDIDO}/cobrar`).send({
      turno_id: TURNO,
      pagos: [{ metodo_pago_id: METODO, monto: 20 }],
    });
    expect(res.status).toBe(201);
    expect(res.body.venta_id).toBe('v-9');
    const registrar = sequelize.query.mock.calls.find(([s]) => s.includes('registrar_venta'));
    expect(registrar).toBeDefined();
    // turno de caja (no propio): se pasa el turno abierto, el usuario es el mesero (JWT).
    expect(registrar[1].replacements.turno).toBe(TURNO);
    expect(registrar[1].replacements.uid).toBe('u-mesero-1');
  });

  test('PATCH /orders/:id -> 403 para mesero (sin pedido.gestionar: no anula)', async () => {
    const res = await request(app).patch(`/api/v1/orders/${PEDIDO}`).send({ estado: 'cancelado' });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden');
  });
});
