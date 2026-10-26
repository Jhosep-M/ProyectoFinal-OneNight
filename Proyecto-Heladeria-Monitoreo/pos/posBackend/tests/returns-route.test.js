'use strict';

/* HU-08 — Devoluciones: POST /returns mapea reglas de negocio a errores
 * humanos (400/404), sin stack. Sin DB ni red real.
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

jest.mock('../src/services/devolucionService', () => ({
  procesar: jest.fn(),
}));

const request = require('supertest');
const devolucionService = require('../src/services/devolucionService');
const { createApp } = require('../src/app');

const app = createApp();
const VENTA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const PRODUCTO = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const body = { venta_id: VENTA, producto_id: PRODUCTO, cantidad: 5, motivo: 'producto en mal estado' };

describe('POST /api/v1/returns', () => {
  beforeEach(() => jest.clearAllMocks());

  test('devolución válida -> 201', async () => {
    devolucionService.procesar.mockResolvedValueOnce({ id_devolucion: 'dev-1' });
    const res = await request(app).post('/api/v1/returns').send(body);
    expect(res.status).toBe(201);
  });

  test('devolver más de lo vendido -> 400 humano, sin stack', async () => {
    devolucionService.procesar.mockRejectedValueOnce(
      new Error('devuelve más de lo vendido (2 vendido, 1 ya devuelto)')
    );
    const res = await request(app).post('/api/v1/returns').send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/más de lo vendido/i);
    expect(JSON.stringify(res.body)).not.toMatch(/at |stack/i);
  });

  test('producto no vendido en esa venta -> 400 humano', async () => {
    devolucionService.procesar.mockRejectedValueOnce(new Error('producto no vendido en esa venta'));
    const res = await request(app).post('/api/v1/returns').send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no fue vendido/i);
  });

  test('venta inexistente -> 404', async () => {
    devolucionService.procesar.mockRejectedValueOnce(new Error('venta no existe'));
    const res = await request(app).post('/api/v1/returns').send(body);
    expect(res.status).toBe(404);
  });

  test('zod: cantidad <= 0 o motivo corto -> 400', async () => {
    const res = await request(app)
      .post('/api/v1/returns')
      .send({ venta_id: VENTA, producto_id: PRODUCTO, cantidad: 0, motivo: 'x' });
    expect(res.status).toBe(400);
    expect(devolucionService.procesar).not.toHaveBeenCalled();
  });
});
