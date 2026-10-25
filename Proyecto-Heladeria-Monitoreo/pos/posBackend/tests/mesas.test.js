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
  authorizeAny: () => (_req, _res, next) => next(),
}));

jest.mock('../src/utils/audit', () => ({
  auditLog: jest.fn().mockResolvedValue(undefined),
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

describe('POST /api/v1/mesas', () => {
  beforeEach(() => jest.clearAllMocks());

  test('duplicado retorna 409 Número de mesa duplicado', async () => {
    const err = new Error('duplicate key');
    err.original = { code: '23505' };
    sequelize.query.mockRejectedValueOnce(err);
    const res = await request(app).post('/api/v1/mesas').send({ numero: 1 });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Número de mesa duplicado');
  });

  test('numero inválido retorna 400', async () => {
    const res = await request(app).post('/api/v1/mesas').send({ numero: -2 });
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/v1/mesas/:id liberar con guard', () => {
  beforeEach(() => jest.clearAllMocks());

  test('a libre con pedidos abiertos o cuenta pendiente → 409', async () => {
    // guard: cuenta abierta con pedidos y total
    sequelize.query.mockResolvedValueOnce([[{ abiertos: 1, total: 68.5 }]]);
    const res = await request(app).patch('/api/v1/mesas/m2').send({ estado: 'libre' });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/cobra antes de liberar/i);
  });

  test('a libre sin cuenta → 200 y audita', async () => {
    const { auditLog } = require('../src/utils/audit');
    sequelize.query.mockResolvedValueOnce([[{ abiertos: 0, total: 0 }]]);
    sequelize.query.mockResolvedValueOnce([[{ id_mesa: 'm1', numero: 1, estado: 'libre' }]]);
    const res = await request(app).patch('/api/v1/mesas/m1').send({ estado: 'libre' });
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('libre');
    expect(auditLog).toHaveBeenCalledWith(expect.objectContaining({ accion: 'mesa.actualizar' }));
  });
});

describe('DELETE /api/v1/mesas/:id (soft inactiva)', () => {
  beforeEach(() => jest.clearAllMocks());

  test('con pedidos abiertos → 409 y no inactiva', async () => {
    sequelize.query.mockResolvedValueOnce([[{ abiertos: 2, total: 120 }]]);
    const res = await request(app).delete('/api/v1/mesas/m2');
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/pedidos/i);
    // solo el guard consultó, sin UPDATE posterior
    expect(sequelize.query).toHaveBeenCalledTimes(1);
  });

  test('sin pedidos abiertos → 200 inactiva + audit mesa.eliminar', async () => {
    const { auditLog } = require('../src/utils/audit');
    sequelize.query.mockResolvedValueOnce([[{ abiertos: 0, total: 0 }]]);
    sequelize.query.mockResolvedValueOnce([[{ id_mesa: 'm1', numero: 1, estado: 'inactiva' }]]);
    const res = await request(app).delete('/api/v1/mesas/m1');
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('inactiva');
    expect(auditLog).toHaveBeenCalledWith(expect.objectContaining({ accion: 'mesa.eliminar' }));
  });

  test('mesa inexistente → 404', async () => {
    sequelize.query.mockResolvedValueOnce([[{ abiertos: 0, total: 0 }]]);
    sequelize.query.mockResolvedValueOnce([[]]);
    const res = await request(app).delete('/api/v1/mesas/no-existe');
    expect(res.status).toBe(404);
  });
});
