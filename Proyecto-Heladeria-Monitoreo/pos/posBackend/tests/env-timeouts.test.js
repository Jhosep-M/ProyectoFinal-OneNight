'use strict';

/* Fase C — env/timeouts: asserts de arranque en producción y constantes de
 * timeout. Sin DB ni red real.
 */

// dotenv mockeado a no-op: cada require fresco de src/config/env debe ver
// SOLO lo que este archivo pone en process.env, nunca el .env real.
jest.mock('dotenv', () => ({ config: jest.fn() }));

const PROD_VARS = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'DATABASE_URL',
  'MONITOREO_URL',
  'MONITOREO_API_KEY',
  'ORGANIZACION_EXTERNA_ID',
];

function loadEnvFresh(overrides = {}) {
  const savedNodeEnv = process.env.NODE_ENV;
  const saved = {};
  for (const k of [...PROD_VARS, 'POS_ALERT_API_KEY', 'NODE_ENV']) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
  process.env.NODE_ENV = 'production';
  process.env.SUPABASE_URL = 'https://x.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'anon';
  process.env.DATABASE_URL = 'postgres://u:p@h:5432/db';
  process.env.MONITOREO_URL = 'https://m.local/api/v1/integrations/consumption';
  process.env.MONITOREO_API_KEY = 'k';
  process.env.ORGANIZACION_EXTERNA_ID = '123e4567-e89b-12d3-a456-426614174001';
  // OJO: process.env.X = undefined guarda el string "undefined" (truthy);
  // para simular ausencia hay que borrar la clave.
  for (const [k, val] of Object.entries(overrides)) {
    if (val === undefined) delete process.env[k];
    else process.env[k] = val;
  }
  let mod;
  jest.isolateModules(() => {
    mod = require('../src/config/env');
  });
  // El restore corre en afterEach: assertEnvForStart lee process.env EN VIVO,
  // así que el fixture debe seguir puesto durante la aserción.
  restorations.push(() => {
    for (const k of [...PROD_VARS, 'POS_ALERT_API_KEY']) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
    if (savedNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = savedNodeEnv;
  });
  return mod;
}

const restorations = [];
afterEach(() => {
  while (restorations.length) restorations.pop()();
});

describe('assertEnvForStart en producción', () => {
  test('completo (con POS_ALERT_API_KEY ausente pero MONITOREO_API_KEY presente) -> no throw', () => {
    const { assertEnvForStart } = loadEnvFresh({ POS_ALERT_API_KEY: undefined });
    expect(() => assertEnvForStart()).not.toThrow();
  });

  test.each(PROD_VARS)('falta %s -> throw nombrándola', (v) => {
    const { assertEnvForStart } = loadEnvFresh({ [v]: undefined });
    expect(() => assertEnvForStart()).toThrow(v);
  });

  test('MONITOREO_URL http en prod -> throw https', () => {
    const { assertEnvForStart } = loadEnvFresh({ MONITOREO_URL: 'http://m.local/x' });
    expect(() => assertEnvForStart()).toThrow(/https/);
  });

  test('ORGANIZACION_EXTERNA_ID no-uuid -> throw', () => {
    const { assertEnvForStart } = loadEnvFresh({ ORGANIZACION_EXTERNA_ID: 'no-uuid' });
    expect(() => assertEnvForStart()).toThrow(/uuid/i);
  });

  test('sin POS_ALERT_API_KEY ni MONITOREO_API_KEY -> throw (falla en MONITOREO_API_KEY, requerido siempre)', () => {
    const { assertEnvForStart } = loadEnvFresh({ MONITOREO_API_KEY: undefined, POS_ALERT_API_KEY: undefined });
    expect(() => assertEnvForStart()).toThrow(/MONITOREO_API_KEY/);
  });
});

describe('timeouts configurados', () => {
  test('HTTP_TIMEOUT_MS es 30s', () => {
    const { HTTP_TIMEOUT_MS } = require('../src/server');
    expect(HTTP_TIMEOUT_MS).toBe(30000);
  });

  test('Sequelize lleva statement_timeout e idle_in_transaction', () => {
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '..', 'src', 'config', 'database.js'), 'utf8'
    );
    expect(src).toMatch(/statement_timeout:\s*15000/);
    expect(src).toMatch(/idle_in_transaction_session_timeout:\s*30000/);
    expect(src).not.toMatch(/rejectUnauthorized:\s*false/);
  });
});
