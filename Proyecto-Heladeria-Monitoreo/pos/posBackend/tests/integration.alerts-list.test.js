'use strict';

/* GET /api/v1/integrations/alerts — alertas recibidas de Monitoreo
 * (alerta_pos con turno_id NULL). supertest + DB y authorize mockeados. */

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key';

let mockPermitir = true; // controlado por cada test

jest.mock('../src/config/database', () => ({
  sequelize: { query: jest.fn(), transaction: jest.fn() },
}));

jest.mock('../src/middlewares/authenticate', () => ({
  authenticateJWT: (req, _res, next) => {
    req.user = { id: 'u-test' };
    next();
  },
}));

jest.mock('../src/middlewares/authorize', () => ({
  authorize: () => (_req, res, next) => (mockPermitir ? next() : res.status(403).json({ error: 'Forbidden' })),
  requirePermission: () => (_req, _res, next) => next(),
}));

const request = require('supertest');
const { sequelize } = require('../src/config/database');
const { createApp } = require('../src/app');

const app = createApp();

beforeEach(() => {
  jest.clearAllMocks();
  mockPermitir = true;
});

describe('GET /api/v1/integrations/alerts', () => {
  test('200 con permiso: lista solo alertas externas (turno_id IS NULL) con total', async () => {
    sequelize.query
      .mockResolvedValueOnce([[{ id_alerta: 'a1', tipo: 'agua', nivel: 'medio', mensaje: 'x', estado: 'pendiente', creado_en: '2026-09-30T00:00:00Z' }]])
      .mockResolvedValueOnce([[{ total: 1 }]]);

    const res = await request(app).get('/api/v1/integrations/alerts');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id_alerta).toBe('a1');

    const sqlRows = sequelize.query.mock.calls[0][0];
    expect(sqlRows).toMatch(/turno_id IS NULL/);
  });

  test('403 sin permiso alerta.consultar', async () => {
    mockPermitir = false;
    const res = await request(app).get('/api/v1/integrations/alerts');
    expect(res.status).toBe(403);
    expect(sequelize.query).not.toHaveBeenCalled();
  });

  test('respeta limit/offset y acota limit a 200', async () => {
    mockPermitir = true;
    sequelize.query.mockResolvedValueOnce([[]]).mockResolvedValueOnce([[{ total: 0 }]]);

    await request(app).get('/api/v1/integrations/alerts?limit=500&offset=10');

    const repl = sequelize.query.mock.calls[0][1].replacements;
    expect(repl.limit).toBe(200);
    expect(repl.offset).toBe(10);
  });
});
