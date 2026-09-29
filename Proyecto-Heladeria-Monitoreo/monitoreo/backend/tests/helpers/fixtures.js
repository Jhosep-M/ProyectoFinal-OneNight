require('./env');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DDL = path.join(__dirname, '..', '..', '..', '..', 'database', 'monitoreo', '001_v1_0_monitoreo_ddl.sql');
const SEED = path.join(__dirname, '..', '..', '..', '..', 'database', 'monitoreo', '002_seed_dev.sql');
const SEED3 = path.join(__dirname, '..', '..', '..', '..', 'database', 'monitoreo', '003_recurso_consultar.sql');

function aSchemaTest(sql) {
  return sql
    .replaceAll('CREATE SCHEMA IF NOT EXISTS monitoreo;', 'CREATE SCHEMA IF NOT EXISTS monitoreo_test;')
    .replaceAll('SET search_path TO monitoreo, public;', 'SET search_path TO monitoreo_test, public;');
}

// Rehace el schema de prueba desde cero: DDL + seed dev (org demo incluida).
async function prepararSchema() {
  const { sequelize } = require('../../src/config/database');
  await sequelize.query('DROP SCHEMA IF EXISTS monitoreo_test CASCADE');
  await sequelize.query(aSchemaTest(fs.readFileSync(DDL, 'utf8')));
  await sequelize.query(aSchemaTest(fs.readFileSync(SEED, 'utf8')));
  await sequelize.query(aSchemaTest(fs.readFileSync(SEED3, 'utf8')));
}

const ORG_DEMO = '11111111-1111-4111-8111-111111111111';

function sha256hex(texto) {
  return crypto.createHash('sha256').update(texto).digest('hex');
}

// Inserta usuario + membresía con el rol indicado en la org demo.
// IMPORTANTE: sin prefijo de schema — estos inserts siguen el search_path
// (monitoreo_test en tests, monitoreo en dev). Un prefijo `monitoreo.` fijo
// escribiría en el schema de producción mientras los tests leen monitoreo_test.
async function seedUsuarioEnOrg(usuarioId, email, rolNombre) {
  const { sequelize } = require('../../src/config/database');
  await sequelize.query(
    `INSERT INTO usuario (id, email, nombre) VALUES (:id, :email, 'Test')
       ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email`,
    { replacements: { id: usuarioId, email } },
  );
  await sequelize.query(
    `INSERT INTO usuario_organizacion (usuario_id, organizacion_id, rol_id)
       SELECT :id, o.id, r.id FROM organizacion o, rol r
        WHERE o.id = :org AND r.nombre = :rol
       ON CONFLICT (usuario_id, organizacion_id) DO UPDATE SET rol_id = EXCLUDED.rol_id, estado='activo'`,
    { replacements: { id: usuarioId, org: ORG_DEMO, rol: rolNombre } },
  );
}

// Crea una integración devolviendo su API key (plaintext solo vive en el test).
async function seedIntegracion(nombre = 'POS test') {
  const { sequelize } = require('../../src/config/database');
  const apiKey = `test-key-${crypto.randomUUID()}`;
  await sequelize.query(
    `INSERT INTO integracion (organizacion_id, nombre, api_key_hash)
     VALUES (:org, :nombre, :hash)`,
    { replacements: { org: ORG_DEMO, nombre, hash: sha256hex(apiKey) } },
  );
  return apiKey;
}

module.exports = { prepararSchema, seedUsuarioEnOrg, seedIntegracion, sha256hex, ORG_DEMO };
