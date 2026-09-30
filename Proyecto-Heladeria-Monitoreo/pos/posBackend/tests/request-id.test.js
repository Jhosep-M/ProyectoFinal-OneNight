'use strict';

/* Fase C — requestId: el x-request-id del cliente solo se propaga si es
 * UUID v4 válido; si no, se genera uno nuevo. Sin DB ni red real.
 */

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key';

jest.mock('../src/config/database', () => ({
  sequelize: { query: jest.fn(async () => [[{}]]) },
}));

const request = require('supertest');
const { createApp } = require('../src/app');
const { UUID_V4 } = require('../src/middlewares/requestId');

const app = createApp();
const VALID = '123e4567-e89b-42d3-a456-426614174000'; // v4 válido

describe('requestId estricto', () => {
  test('UUID v4 válido se propaga en la respuesta', async () => {
    const res = await request(app).get('/health').set('x-request-id', VALID);
    expect(res.headers['x-request-id']).toBe(VALID);
  });

  test.each([
    ['basura'],
    ['123'],
    ["' OR 1=1 --"],
    ['123e4567-e89b-12d3-a456-426614174000'], // v1, no v4
    ['<script>alert(1)</script>'],
  ])('valor no-UUID %p -> se genera uno nuevo con formato v4', async (evil) => {
    const res = await request(app).get('/health').set('x-request-id', evil);
    const out = res.headers['x-request-id'];
    expect(out).not.toBe(evil);
    expect(UUID_V4.test(out)).toBe(true);
  });

  test('sin header -> se genera UUID v4', async () => {
    const res = await request(app).get('/health');
    expect(UUID_V4.test(res.headers['x-request-id'])).toBe(true);
  });
});
