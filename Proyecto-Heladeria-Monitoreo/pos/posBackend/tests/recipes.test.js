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
  createRecipeSchema,
  updateRecipeSchema,
  uuidParamSchema,
  listRecipeQuerySchema,
} = require('../src/validators/recipe');

const app = createApp();
const VALID_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const PROD_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const INS_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

describe('validators/recipe', () => {
  test('create exige UUIDs y cantidad positiva', () => {
    const parsed = createRecipeSchema.parse({ producto_id: PROD_ID, insumo_id: INS_ID, cantidad_requerida: 0.5 });
    expect(parsed.cantidad_requerida).toBe(0.5);
    expect(() => createRecipeSchema.parse({ producto_id: PROD_ID, insumo_id: INS_ID, cantidad_requerida: 0 })).toThrow();
    expect(() => createRecipeSchema.parse({ producto_id: 'no-uuid', insumo_id: INS_ID, cantidad_requerida: 1 })).toThrow();
  });

  test('update vacío lanza ZodError', () => {
    expect(() => updateRecipeSchema.parse({})).toThrow();
  });

  test('query con producto_id inválido lanza ZodError', () => {
    expect(() => listRecipeQuerySchema.parse({ producto_id: 'no-uuid' })).toThrow();
    expect(listRecipeQuerySchema.parse({}).producto_id).toBeUndefined();
  });

  test('uuidParamSchema rechaza no-uuid', () => {
    expect(() => uuidParamSchema.parse('no-uuid')).toThrow();
    expect(uuidParamSchema.parse(VALID_ID)).toBe(VALID_ID);
  });
});

describe('routes/recipes', () => {
  beforeEach(() => jest.clearAllMocks());

  test('GET /?producto_id filtra por producto (parametrizado)', async () => {
    sequelize.query.mockResolvedValueOnce([[{ id_receta: VALID_ID, insumo_nombre: 'Leche' }]]);
    const res = await request(app).get(`/api/v1/recipes?producto_id=${PROD_ID}`);
    expect(res.status).toBe(200);
    expect(res.body[0].insumo_nombre).toBe('Leche');
    const [, opts] = sequelize.query.mock.calls[0];
    expect(opts.replacements.pid).toBe(PROD_ID);
  });

  test('GET /?producto_id=no-uuid -> 400', async () => {
    const res = await request(app).get('/api/v1/recipes?producto_id=no-uuid');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(sequelize.query).not.toHaveBeenCalled();
  });

  test('POST crea línea verificando producto e insumo', async () => {
    sequelize.query
      .mockResolvedValueOnce([[{ '?column?': 1 }]])
      .mockResolvedValueOnce([[{ '?column?': 1 }]])
      .mockResolvedValueOnce([[{ id_receta: VALID_ID, cantidad_requerida: 0.5 }]]);
    const res = await request(app)
      .post('/api/v1/recipes')
      .send({ producto_id: PROD_ID, insumo_id: INS_ID, cantidad_requerida: 0.5 });
    expect(res.status).toBe(201);
    expect(sequelize.query).toHaveBeenCalledTimes(3);
  });

  test('POST con producto inexistente -> 404 sin INSERT', async () => {
    sequelize.query.mockResolvedValueOnce([[]]);
    const res = await request(app)
      .post('/api/v1/recipes')
      .send({ producto_id: PROD_ID, insumo_id: INS_ID, cantidad_requerida: 0.5 });
    expect(res.status).toBe(404);
    expect(sequelize.query).toHaveBeenCalledTimes(1);
  });

  test('POST duplicado (23505) -> 409', async () => {
    sequelize.query
      .mockResolvedValueOnce([[{ '?column?': 1 }]])
      .mockResolvedValueOnce([[{ '?column?': 1 }]])
      .mockRejectedValueOnce(Object.assign(new Error('duplicate'), { code: '23505' }));
    const res = await request(app)
      .post('/api/v1/recipes')
      .send({ producto_id: PROD_ID, insumo_id: INS_ID, cantidad_requerida: 0.5 });
    expect(res.status).toBe(409);
  });

  test('PATCH actualiza cantidad', async () => {
    sequelize.query.mockResolvedValueOnce([[{ id_receta: VALID_ID, cantidad_requerida: 1 }]]);
    const res = await request(app)
      .patch(`/api/v1/recipes/${VALID_ID}`)
      .send({ cantidad_requerida: 1 });
    expect(res.status).toBe(200);
    const [, opts] = sequelize.query.mock.calls[0];
    expect(opts.replacements.cant).toBe(1);
  });

  test('PATCH /no-uuid -> 400 sin UPDATE', async () => {
    const res = await request(app)
      .patch('/api/v1/recipes/no-uuid')
      .send({ cantidad_requerida: 1 });
    expect(res.status).toBe(400);
    expect(sequelize.query).not.toHaveBeenCalled();
  });

  test('DELETE elimina y responde eliminado:true', async () => {
    sequelize.query.mockResolvedValueOnce([[{ id_receta: VALID_ID }]]);
    const res = await request(app).delete(`/api/v1/recipes/${VALID_ID}`);
    expect(res.status).toBe(200);
    expect(res.body.eliminado).toBe(true);
  });

  test('DELETE inexistente -> 404', async () => {
    sequelize.query.mockResolvedValueOnce([[]]);
    const res = await request(app).delete(`/api/v1/recipes/${VALID_ID}`);
    expect(res.status).toBe(404);
  });
});
