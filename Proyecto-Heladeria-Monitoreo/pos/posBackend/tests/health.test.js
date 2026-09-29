'use strict';

/* Persona 4 — Observabilidad: /health verifica DB (readiness real para K8s).
 * Sin DB ni red real.
 */

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key';

jest.mock('../src/config/database', () => ({
  sequelize: { query: jest.fn() },
}));

const request = require('supertest');
const { sequelize } = require('../src/config/database');
const { createApp } = require('../src/app');

const app = createApp();

describe('GET /health', () => {
  beforeEach(() => jest.clearAllMocks());

  test('DB ok -> 200 con db:up', async () => {
    sequelize.query.mockResolvedValueOnce([[{}]]);
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.db).toBe('up');
  });

  test('DB caida -> 503 sin fugar detail', async () => {
    sequelize.query.mockRejectedValueOnce(new Error('connect secreto ECONNREFUSED'));
    const res = await request(app).get('/health');
    expect(res.status).toBe(503);
    expect(res.body.ok).toBe(false);
    expect(JSON.stringify(res.body)).not.toMatch(/secreto|ECONNREFUSED/);
  });
});
