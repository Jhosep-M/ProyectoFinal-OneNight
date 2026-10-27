'use strict';

/* Persona 4 — Rate limit: el endpoint de alertas (authLimiter: 20/15min)
 * responde 429 al exceder. Sin DB ni red real.
 */

process.env.POS_ALERT_API_KEY = 'test-alert-key-rl';
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key';

jest.mock('../src/config/database', () => ({
  sequelize: { query: jest.fn() },
}));

const request = require('supertest');
const { sequelize } = require('../src/config/database');
const { createApp } = require('../src/app');

const app = createApp();

const VALID = {
  alertaId: '123e4567-e89b-12d3-a456-426614174000',
  nivel: 'critico',
  tipoRecurso: 'energia',
  mensaje: 'Consumo superior al umbral',
  fechaGeneracion: '2026-09-21T18:00:00.000Z',
};

describe('rate limit en /api/v1/integrations/alerts', () => {
  test('request 21 en ventana -> 429 con code RATE_LIMITED', async () => {
    sequelize.query.mockResolvedValue([[]]);
    let last;
    for (let i = 0; i < 21; i++) {
      last = await request(app)
        .post('/api/v1/integrations/alerts')
        .set('x-api-key', 'test-alert-key-rl')
        .send(VALID);
    }
    expect(last.status).toBe(429);
    expect(last.body.error).toBe('Too many auth attempts');
    expect(last.body.code).toBe('RATE_LIMITED');
    expect(last.headers['retry-after']).toBeDefined();
  }, 30000);
});

describe('rate limit diferenciado GET vs POST', () => {
  test('GETs no consumen el bucket de escritura: 30 GET /api/v1/categories no dan 429', async () => {
    sequelize.query.mockResolvedValue([[]]);
    let last;
    for (let i = 0; i < 30; i++) {
      last = await request(app).get('/api/v1/categories');
    }
    // Puede ser 200/401/403 según auth, pero nunca 429 con el readLimiter generoso.
    expect(last.status).not.toBe(429);
  }, 30000);

  test('/health queda fuera del rate limit', async () => {
    sequelize.query.mockResolvedValue([[1]]);
    const r = await request(app).get('/health');
    expect([200, 503]).toContain(r.status);
    expect(r.status).not.toBe(429);
  }, 30000);
});
