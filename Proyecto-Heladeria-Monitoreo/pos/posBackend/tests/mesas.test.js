'use strict';

/* Bloque 1 — Mesas: el frontend necesita listar mesas y ver sus pedidos
 * abiertos. Sin DB ni red real (middlewares y DB mockeados).
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

const request = require('supertest');
const { sequelize } = require('../src/config/database');
const { createApp } = require('../src/app');

const app = createApp();

describe('GET /api/v1/mesas', () => {
  beforeEach(() => jest.clearAllMocks());

  test('lista mesas ordenadas por numero', async () => {
    const filas = [
      { id_mesa: 'm1', numero: 1, estado: 'libre' },
      { id_mesa: 'm2', numero: 2, estado: 'ocupada' },
    ];
    sequelize.query.mockResolvedValueOnce([filas]);
    const res = await request(app).get('/api/v1/mesas');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(filas);
    const [sql] = sequelize.query.mock.calls[0];
    expect(sql).toMatch(/FROM mesa/);
    expect(sql).toMatch(/ORDER BY numero/);
  });

  test('GET /:id retorna mesa con sus pedidos no cerrados; 404 si no existe', async () => {
    sequelize.query.mockResolvedValueOnce([[{ id_mesa: 'm2', numero: 2, estado: 'ocupada' }]]);
    sequelize.query.mockResolvedValueOnce([[{ id_pedido: 'p1', estado: 'abierto' }]]);
    const ok = await request(app).get('/api/v1/mesas/m2');
    expect(ok.status).toBe(200);
    expect(ok.body.id_mesa).toBe('m2');
    expect(ok.body.pedidos).toHaveLength(1);

    sequelize.query.mockResolvedValueOnce([[]]);
    const nf = await request(app).get('/api/v1/mesas/no-existe');
    expect(nf.status).toBe(404);
  });
});
