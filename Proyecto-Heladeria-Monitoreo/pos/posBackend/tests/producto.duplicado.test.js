'use strict';

// BUG Trello ERRORES: dos productos de la misma categoria no pueden
// tener el mismo nombre (case-insensitive + trim). Capa 2/3: backend.

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
  authorizeAny: () => (_req, _res, next) => next(),
  requirePermission: () => (_req, _res, next) => next(),
}));
jest.mock('../src/utils/audit', () => ({ auditLog: jest.fn() }));

const request = require('supertest');
const { sequelize } = require('../src/config/database');
const { createApp } = require('../src/app');

const app = createApp();
const CAT_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const CAT_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const PROD_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const OTRO_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const MSG = 'Ya existe un producto con ese nombre en la categoría';

describe('routes/products duplicado por categoria', () => {
  beforeEach(() => jest.clearAllMocks());

  test('POST duplicado misma categoria (distinto case/espacios) -> 409', async () => {
    sequelize.query.mockResolvedValueOnce([[{ id_producto: OTRO_ID }]]); // existeDuplicado
    const res = await request(app).post('/api/v1/products').send({
      nombre: '  helado VAINILLA ',
      precio: 12.5,
      categoria_id: CAT_A,
    });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe(MSG);
    expect(sequelize.query).toHaveBeenCalledTimes(1); // no llega al INSERT
  });

  test('POST mismo nombre distinta categoria -> 201', async () => {
    sequelize.query
      .mockResolvedValueOnce([[]]) // existeDuplicado: libre
      .mockResolvedValueOnce([[{ id_producto: PROD_ID, nombre: 'Helado Vainilla', categoria_id: CAT_B }]]);
    const res = await request(app).post('/api/v1/products').send({
      nombre: 'Helado Vainilla',
      precio: 12.5,
      categoria_id: CAT_B,
    });
    expect(res.status).toBe(201);
    expect(res.body.id_producto).toBe(PROD_ID);
  });

  test('POST carrera concurrente (23505) -> 409', async () => {
    sequelize.query
      .mockResolvedValueOnce([[]]) // existeDuplicado: libre
      .mockRejectedValueOnce(Object.assign(new Error('duplicate key value'), { code: '23505' }));
    const res = await request(app).post('/api/v1/products').send({
      nombre: 'Helado Vainilla',
      precio: 12.5,
      categoria_id: CAT_A,
    });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe(MSG);
  });

  test('PATCH a nombre existente en la categoria -> 409', async () => {
    sequelize.query
      .mockResolvedValueOnce([[{ nombre: 'Otro', categoria_id: CAT_A }]]) // producto actual
      .mockResolvedValueOnce([[{ id_producto: OTRO_ID }]]); // existeDuplicado (excluye propio id)
    const res = await request(app)
      .patch(`/api/v1/products/${PROD_ID}`)
      .send({ nombre: 'Helado Vainilla' });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe(MSG);
  });

  test('PATCH propio sin cambiar nombre -> 200', async () => {
    sequelize.query
      .mockResolvedValueOnce([[{ nombre: 'Helado Vainilla', categoria_id: CAT_A }]])
      .mockResolvedValueOnce([[]]) // sin duplicado (propio id excluido)
      .mockResolvedValueOnce([[{ id_producto: PROD_ID, nombre: 'Helado Vainilla', precio: 15 }]]);
    const res = await request(app)
      .patch(`/api/v1/products/${PROD_ID}`)
      .send({ nombre: 'Helado Vainilla', precio: 15 });
    expect(res.status).toBe(200);
    expect(res.body.precio).toBe(15);
  });

  test('PATCH solo precio (sin nombre/categoria) no chequea duplicado -> 200', async () => {
    sequelize.query.mockResolvedValueOnce([[{ id_producto: PROD_ID, precio: 15 }]]);
    const res = await request(app)
      .patch(`/api/v1/products/${PROD_ID}`)
      .send({ precio: 15 });
    expect(res.status).toBe(200);
    expect(sequelize.query).toHaveBeenCalledTimes(1);
    expect(sequelize.query.mock.calls[0][0]).toMatch(/UPDATE producto SET/);
  });

  test('PATCH duplicado (23505) -> 409', async () => {
    sequelize.query
      .mockResolvedValueOnce([[{ nombre: 'Otro', categoria_id: CAT_A }]])
      .mockResolvedValueOnce([[]])
      .mockRejectedValueOnce(Object.assign(new Error('duplicate key value'), { code: '23505' }));
    const res = await request(app)
      .patch(`/api/v1/products/${PROD_ID}`)
      .send({ nombre: 'Helado Vainilla' });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe(MSG);
  });
});
