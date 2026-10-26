'use strict';

/* Ruta POST /api/v1/sales y POST /:id/anular: los RAISE EXCEPTION de negocio
 * de PG (SQLSTATE P0001) se traducen a 400 humano (BUG Sprint 2). Sin DB real.
 */

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key';

jest.mock('../src/config/database', () => ({ sequelize: { query: jest.fn() } }));
jest.mock('../src/middlewares/authenticate', () => ({
  authenticateJWT: (req, _res, next) => {
    req.user = { id: '11111111-1111-4111-8111-111111111111' };
    next();
  },
}));
jest.mock('../src/middlewares/authorize', () => ({
  authorize: () => (_req, _res, next) => next(),
  authorizeAny: () => (_req, _res, next) => next(),
  requirePermission: () => (_req, _res, next) => next(),
}));
jest.mock('../src/utils/audit', () => ({ auditLog: jest.fn() }));

const request = require('supertest');
const { sequelize } = require('../src/config/database');
const { createApp } = require('../src/app');

const app = createApp();
const TURNO = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const PROD = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const METODO = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const VENTA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const ventaValida = {
  turno_id: TURNO,
  items: [{ producto_id: PROD, cantidad: 1 }],
  pagos: [{ metodo_pago_id: METODO, monto: 10 }],
};

describe('POST /api/v1/sales', () => {
  beforeEach(() => jest.clearAllMocks());

  test('venta valida -> 201 con venta_id', async () => {
    sequelize.query.mockResolvedValue([[{ venta_id: 'v-1' }]]);
    const res = await request(app).post('/api/v1/sales').send(ventaValida);
    expect(res.status).toBe(201);
    expect(res.body.venta_id).toBe('v-1');
  });

  test('P0001 stock insuficiente -> 400 humano', async () => {
    sequelize.query.mockRejectedValue({ code: 'P0001', message: 'STOCK_INSUFICIENTE dddddddd-dddd-4ddd-8ddd-dddddddddddd' });
    const res = await request(app).post('/api/v1/sales').send(ventaValida);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Stock insuficiente para completar la operación');
  });

  test('P0001 pagos no coinciden con total -> 400 humano', async () => {
    sequelize.query.mockRejectedValue({ code: 'P0001', message: 'pagos 5.00 no coinciden con total 10.00' });
    const res = await request(app).post('/api/v1/sales').send(ventaValida);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Los pagos no coinciden con el total de la venta');
  });

  test('P0001 turno no abierto -> 400 humano', async () => {
    sequelize.query.mockRejectedValue({ code: 'P0001', message: 'turno no abierto' });
    const res = await request(app).post('/api/v1/sales').send(ventaValida);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('No hay un turno abierto para registrar la venta');
  });

  test('23514 producto_stock_ck (stock real insuficiente) -> 400 humano', async () => {
    sequelize.query.mockRejectedValue({
      name: 'SequelizeDatabaseError',
      message: 'new row for relation "producto" violates check constraint "producto_stock_ck"',
      original: { code: '23514', constraint: 'producto_stock_ck', detail: 'Failing row contains stock -28' },
    });
    const res = await request(app).post('/api/v1/sales').send(ventaValida);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Stock insuficiente para completar la operación');
  });

  test('P0001 mensaje desconocido -> 400 con el mensaje PG', async () => {
    sequelize.query.mockRejectedValue({ code: 'P0001', message: 'regla de negocio nueva' });
    const res = await request(app).post('/api/v1/sales').send(ventaValida);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('regla de negocio nueva');
  });

  test('payload invalido (zod) -> 400 Validation failed sin tocar DB', async () => {
    const res = await request(app).post('/api/v1/sales').send({ turno_id: 'no-uuid', items: [], pagos: [] });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(sequelize.query).not.toHaveBeenCalled();
  });
});

describe('POST /api/v1/sales/:id/anular', () => {
  beforeEach(() => jest.clearAllMocks());

  test('anulacion valida -> 200 ok', async () => {
    sequelize.query.mockResolvedValue([[]]);
    const res = await request(app).post(`/api/v1/sales/${VENTA}/anular`).send({ motivo: 'Venta duplicada por error' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('P0001 venta no existe -> 404 humano', async () => {
    sequelize.query.mockRejectedValue({ code: 'P0001', message: 'venta no existe' });
    const res = await request(app).post(`/api/v1/sales/${VENTA}/anular`).send({ motivo: 'Venta duplicada por error' });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Venta no encontrada');
  });

  test('P0001 venta no está activa -> 409 humano', async () => {
    sequelize.query.mockRejectedValue({ code: 'P0001', message: 'venta no está activa: anulada' });
    const res = await request(app).post(`/api/v1/sales/${VENTA}/anular`).send({ motivo: 'Venta duplicada por error' });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('La venta no está activa');
  });

  test('motivo corto -> 400 sin tocar DB', async () => {
    const res = await request(app).post(`/api/v1/sales/${VENTA}/anular`).send({ motivo: 'x' });
    expect(res.status).toBe(400);
    expect(sequelize.query).not.toHaveBeenCalled();
  });
});
