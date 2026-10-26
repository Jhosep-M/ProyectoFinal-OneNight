'use strict';

/* HU-20 — Catálogo admin de métodos de pago: POST crea (409 duplicado),
 * PATCH desactiva. Sin DB ni red real.
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

describe('catálogo de métodos de pago (HU-20)', () => {
  beforeEach(() => jest.clearAllMocks());

  test('POST /payments/metodos crea -> 201 + auditLog', async () => {
    sequelize.query.mockResolvedValueOnce([[{ id_metodo_pago: 'm1', nombre: 'QR', estado: 'activo' }]]);
    const res = await request(app).post('/api/v1/payments/metodos').send({ nombre: 'QR' });
    expect(res.status).toBe(201);
    expect(res.body.nombre).toBe('QR');
    expect(auditLog).toHaveBeenCalledWith(expect.objectContaining({ accion: 'metodo_pago.crear' }));
  });

  test('nombre duplicado -> 409 humano', async () => {
    const err = new Error('duplicate');
    err.original = { code: '23505' };
    sequelize.query.mockRejectedValueOnce(err);
    const res = await request(app).post('/api/v1/payments/metodos').send({ nombre: 'Efectivo' });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/duplicado/i);
  });

  test('nombre inválido (zod) -> 400 sin tocar DB de escritura', async () => {
    const res = await request(app).post('/api/v1/payments/metodos').send({ nombre: 'x' });
    expect(res.status).toBe(400);
    expect(sequelize.query).not.toHaveBeenCalled();
  });

  test('PATCH /payments/metodos/:id desactiva -> 200', async () => {
    sequelize.query.mockResolvedValueOnce([[{ id_metodo_pago: 'm1', nombre: 'QR', estado: 'inactivo' }]]);
    const res = await request(app).patch('/api/v1/payments/metodos/m1').send({ estado: 'inactivo' });
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('inactivo');
  });

  test('PATCH inexistente -> 404', async () => {
    sequelize.query.mockResolvedValueOnce([[]]);
    const res = await request(app).patch('/api/v1/payments/metodos/no-id').send({ estado: 'inactivo' });
    expect(res.status).toBe(404);
  });
});
