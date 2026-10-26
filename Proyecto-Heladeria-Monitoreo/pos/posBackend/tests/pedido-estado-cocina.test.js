'use strict';

/* HU-04 Cocina: PATCH /orders/:id/estado solo permite
 * abierto -> en_preparacion -> listo. Cualquier otro salto -> 409
 * con mensaje humano. Sin permiso pedido.estado -> 403.
 * Cocina tampoco puede tocar /sales (venta.consultar/crear) -> 403.
 */

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key';

const mockCocinaPerms = new Set(['pedido.consultar', 'mesa.consultar', 'producto.consultar', 'pedido.estado']);

jest.mock('../src/config/database', () => ({
  sequelize: { query: jest.fn(), transaction: jest.fn((cb) => cb({})) },
}));

jest.mock('../src/middlewares/authenticate', () => ({
  authenticateJWT: (req, _res, next) => {
    req.user = { id: 'u-cocina-1' };
    next();
  },
}));

jest.mock('../src/middlewares/authorize', () => ({
  authorize: (permiso) => (req, res, next) => {
    if (!mockCocinaPerms.has(permiso)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return next();
  },
  requirePermission: (permiso) => (req, res, next) => {
    if (!mockCocinaPerms.has(permiso)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return next();
  },
  authorizeAny: (permisos) => (req, res, next) => {
    const lista = Array.isArray(permisos) ? permisos : [permisos];
    if (!lista.some((p) => mockCocinaPerms.has(p))) {
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
const { auditLog } = require('../src/utils/audit');
const { createApp } = require('../src/app');

const app = createApp();
const PEDIDO = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function mockTransicion(estadoActual, estadoNuevo) {
  sequelize.query.mockImplementation(async (sql) => {
    if (sql.includes('FROM pedido') && sql.includes('FOR UPDATE')) {
      return [[{ id_pedido: PEDIDO, estado: estadoActual }]];
    }
    if (sql.includes('UPDATE pedido SET estado')) {
      return [[{ id_pedido: PEDIDO, estado: estadoNuevo }]];
    }
    return [[{ id_pedido: PEDIDO, estado: estadoNuevo }]];
  });
}

describe('HU-04 cocina: PATCH /orders/:id/estado', () => {
  beforeEach(() => jest.clearAllMocks());

  test('abierto -> en_preparacion -> 200 y audita', async () => {
    mockTransicion('abierto', 'en_preparacion');
    const res = await request(app).patch(`/api/v1/orders/${PEDIDO}/estado`).send({ estado: 'en_preparacion' });
    expect(res.status).toBe(200);
    expect(auditLog).toHaveBeenCalledWith(expect.objectContaining({ accion: 'pedido.estado' }));
  });

  test('en_preparacion -> listo -> 200 y marca fecha_listo (mig 026)', async () => {
    mockTransicion('en_preparacion', 'listo');
    const res = await request(app).patch(`/api/v1/orders/${PEDIDO}/estado`).send({ estado: 'listo' });
    expect(res.status).toBe(200);
    const updateCall = sequelize.query.mock.calls.find(([s]) => s.includes('UPDATE pedido SET estado'));
    expect(updateCall).toBeDefined();
    expect(updateCall[0]).toMatch(/fecha_listo/);
  });

  test('listo -> abierto es invalido -> 409 humano sin UPDATE', async () => {
    mockTransicion('listo', 'listo');
    const res = await request(app).patch(`/api/v1/orders/${PEDIDO}/estado`).send({ estado: 'abierto' });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/No se puede/i);
    expect(sequelize.query.mock.calls.some(([s]) => s.includes('UPDATE pedido SET estado'))).toBe(false);
  });

  test('cocina no puede cerrar/cobrar desde estado -> 400 zod', async () => {
    mockTransicion('listo', 'listo');
    const res = await request(app).patch(`/api/v1/orders/${PEDIDO}/estado`).send({ estado: 'cerrado' });
    expect(res.status).toBe(400);
  });

  test('estado fuera de vocabulario cocina -> 400 zod', async () => {
    const res = await request(app).patch(`/api/v1/orders/${PEDIDO}/estado`).send({ estado: 'cancelado' });
    expect(res.status).toBe(400);
  });

  test('cocina no puede cobrar (sin venta.crear) -> 403', async () => {
    const res = await request(app).post(`/api/v1/orders/${PEDIDO}/cobrar`).send({
      turno_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      pagos: [{ metodo_pago_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', monto: 10 }],
    });
    expect(res.status).toBe(403);
  });

  test('cocina no puede ver ventas (sin venta.consultar) -> 403', async () => {
    const res = await request(app).get('/api/v1/sales');
    expect(res.status).toBe(403);
  });
});
