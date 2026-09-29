// Cargar .env ANTES de evaluar tieneBD (MONITOREO_TEST_DATABASE_URL vive ahí).
// dotenv no pisas variables ya presentes en el shell.
require('dotenv').config({ quiet: true });

// Fijar env ANTES de requerir src/** (el config se lee al hacer require).
process.env.NODE_ENV = 'test';
process.env.PORT = '0';
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.invalid';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key';
// SIEMPRE monitoreo_test: asignación incondicional — jamás hereda `monitoreo` de .env (aislamiento de schema).
process.env.MONITOREO_DB_SCHEMA = 'monitoreo_test';

const { test } = require('node:test');

const tieneBD = !!process.env.MONITOREO_TEST_DATABASE_URL;

// Test que requiere BD: se auto-salta con aviso si no hay URL de test.
const dbTest = tieneBD
  ? test
  : (name) => test(name, { skip: 'DEFINIR MONITOREO_TEST_DATABASE_URL para correr tests de BD (ver .env.example)' }, () => {});

module.exports = { tieneBD, dbTest };
