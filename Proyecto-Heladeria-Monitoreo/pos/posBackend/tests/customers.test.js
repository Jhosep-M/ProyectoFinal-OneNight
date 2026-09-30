'use strict';

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key';

jest.mock('../src/config/database', () => ({ sequelize: { query: jest.fn(), transaction: jest.fn() } }));
jest.mock('../src/middlewares/authenticate', () => ({
  authenticateJWT: (req, _res, next) => {
    req.user = { id: '11111111-1111-4111-8111-111111111111' };
    next();
  },
}));
jest.mock('../src/middlewares/authorize', () => ({
  authorize: () => (_req, _res, next) => next(),
  requirePermission: () => (_req, _res, next) => next(),
}));
jest.mock('../src/utils/audit', () => ({ auditLog: jest.fn() }));

const request = require('supertest');
const { sequelize } = require('../src/config/database');
const { createApp } = require('../src/app');
const {
  createCustomerSchema,
  updateCustomerSchema,
  uuidParamSchema,
  listQuerySchema,
  ajustePuntosSchema,
} = require('../src/validators/customer');

const app = createApp();
const VALID_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

describe('validators/customer', () => {
  test('(a) create ignora puntos_fidelidad (strip unknown)', () => {
    const parsed = createCustomerSchema.parse({ nombre: 'Ana', puntos_fidelidad: 999 });
    expect(parsed.nombre).toBe('Ana');
    expect(parsed.puntos_fidelidad).toBeUndefined();
  });

  test('(b) update con puntos_fidelidad lanza ZodError', () => {
    expect(() => updateCustomerSchema.parse({ puntos_fidelidad: 5 })).toThrow();
    try {
      updateCustomerSchema.parse({ puntos_fidelidad: 5 });
    } catch (e) {
      expect(e.name).toBe('ZodError');
    }
  });

  test('(c) uuidParamSchema rechaza no-uuid', () => {
    expect(() => uuidParamSchema.parse('no-uuid')).toThrow();
    expect(uuidParamSchema.parse(VALID_ID)).toBe(VALID_ID);
  });
});

describe('routes/customers', () => {
  beforeEach(() => jest.clearAllMocks());

  test('POST fuerza puntos_fidelidad=0 aunque body traiga valor', async () => {
    sequelize.query.mockResolvedValueOnce([[{ id_cliente: VALID_ID, puntos_fidelidad: 0 }]]);
    const res = await request(app)
      .post('/api/v1/customers')
      .send({ nombre: 'Ana', puntos_fidelidad: 999 });
    expect(res.status).toBe(201);
    const [, opts] = sequelize.query.mock.calls[0];
    expect(opts.replacements.puntos).toBe(0);
  });

  test('PATCH con puntos_fidelidad -> 400 sin UPDATE', async () => {
    const res = await request(app)
      .patch(`/api/v1/customers/${VALID_ID}`)
      .send({ puntos_fidelidad: 5 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(sequelize.query).not.toHaveBeenCalled();
  });

  test('GET /:id con id no-uuid -> 400', async () => {
    const res = await request(app).get('/api/v1/customers/no-uuid');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(sequelize.query).not.toHaveBeenCalled();
  });

  test('PATCH /:id con id no-uuid -> 400', async () => {
    const res = await request(app).patch('/api/v1/customers/no-uuid').send({ nombre: 'X' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(sequelize.query).not.toHaveBeenCalled();
  });

  test('POST duplicado (23505) -> 409', async () => {
    const err = new Error('duplicate key value');
    err.code = '23505';
    sequelize.query.mockRejectedValueOnce(err);
    const res = await request(app).post('/api/v1/customers').send({ nombre: 'Ana' });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Correo o teléfono duplicado');
  });

  test('PATCH duplicado (23505) -> 409', async () => {
    const err = new Error('duplicate key value');
    err.code = '23505';
    sequelize.query.mockRejectedValueOnce(err);
    const res = await request(app)
      .patch(`/api/v1/customers/${VALID_ID}`)
      .send({ nombre: 'Otro' });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Correo o teléfono duplicado');
  });

  test('listQuerySchema coerce string "20"->20 con defaults', () => {
    const parsed = listQuerySchema.parse({ limit: '20' });
    expect(parsed.limit).toBe(20);
    expect(parsed.offset).toBe(0);
    expect(parsed.q).toBeUndefined();
  });

  test('GET / con q=ana usa ILIKE con replacements qlike=%ana%', async () => {
    sequelize.query.mockResolvedValueOnce([[]]);
    const res = await request(app).get('/api/v1/customers?q=ana');
    expect(res.status).toBe(200);
    const [sql, opts] = sequelize.query.mock.calls[0];
    expect(sql).toMatch(/ILIKE/);
    expect(opts.replacements.qlike).toBe('%ana%');
    expect(opts.replacements.q).toBe('ana');
  });

  test('GET /:id/ventas retorna array', async () => {
    sequelize.query
      .mockResolvedValueOnce([[{ id_cliente: VALID_ID }]])
      .mockResolvedValueOnce([[{ id_venta: VALID_ID, total: 10, estado: 'activa', fecha: '2026-09-30' }]]);
    const res = await request(app).get(`/api/v1/customers/${VALID_ID}/ventas`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('ajustePuntosSchema puntos=0 -> ZodError', () => {
    expect(() => ajustePuntosSchema.parse({ puntos: 0, tipo: 'ajuste', motivo: 'correccion' })).toThrow();
    try {
      ajustePuntosSchema.parse({ puntos: 0, tipo: 'ajuste', motivo: 'correccion' });
    } catch (e) {
      expect(e.name).toBe('ZodError');
    }
  });

  test('POST /:id/ajustes-puntos valido llama INSERT+UPDATE y retorna 201', async () => {
    const commit = jest.fn();
    const rollback = jest.fn();
    sequelize.transaction.mockResolvedValueOnce({ commit, rollback });
    sequelize.query
      .mockResolvedValueOnce([[{ id_cliente: VALID_ID, puntos_fidelidad: 100 }]])
      .mockResolvedValueOnce([[{ id_movimiento: VALID_ID, cliente_id: VALID_ID, puntos: 50, tipo: 'ajuste', motivo: 'bono' }]])
      .mockResolvedValueOnce([[{ id_cliente: VALID_ID, puntos_fidelidad: 150 }]]);
    const res = await request(app)
      .post(`/api/v1/customers/${VALID_ID}/ajustes-puntos`)
      .send({ puntos: 50, tipo: 'ajuste', motivo: 'bono' });
    expect(res.status).toBe(201);
    expect(res.body.cliente.puntos_fidelidad).toBe(150);
    expect(res.body.movimiento.puntos).toBe(50);
    const calls = sequelize.query.mock.calls;
    expect(calls[0][0]).toMatch(/FOR UPDATE/);
    expect(calls[1][0]).toMatch(/INSERT INTO movimiento_puntos/);
    expect(calls[2][0]).toMatch(/UPDATE cliente SET puntos_fidelidad/);
    expect(commit).toHaveBeenCalled();
    expect(rollback).not.toHaveBeenCalled();
  });

  test('POST /:id/ajustes-puntos saldo insuficiente -> 422 con rollback', async () => {
    const commit = jest.fn();
    const rollback = jest.fn();
    sequelize.transaction.mockResolvedValueOnce({ commit, rollback });
    sequelize.query.mockResolvedValueOnce([[{ id_cliente: VALID_ID, puntos_fidelidad: 10 }]]);
    const res = await request(app)
      .post(`/api/v1/customers/${VALID_ID}/ajustes-puntos`)
      .send({ puntos: -50, tipo: 'canje', motivo: 'canje premio' });
    expect(res.status).toBe(422);
    expect(res.body.error).toBe('Saldo insuficiente');
    expect(rollback).toHaveBeenCalled();
    expect(commit).not.toHaveBeenCalled();
    expect(sequelize.query).toHaveBeenCalledTimes(1);
  });

  test('POST /:id/ajustes-puntos puntos=0 -> 400 sin transaction', async () => {
    const res = await request(app)
      .post(`/api/v1/customers/${VALID_ID}/ajustes-puntos`)
      .send({ puntos: 0, tipo: 'ajuste', motivo: 'bono' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(sequelize.transaction).not.toHaveBeenCalled();
  });
});
