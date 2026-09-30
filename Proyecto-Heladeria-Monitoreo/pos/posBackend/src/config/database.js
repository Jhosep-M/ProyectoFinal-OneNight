const { Sequelize } = require('sequelize');
const { env } = require('./env');

// TLS: en producción se exige verificación del certificado.
// rejectUnauthorized=env.dbSslRejectUnauthorized (true estricto en prod; configurable en dev/test).
const sslOptions = env.nodeEnv === 'production' || env.dbSslRejectUnauthorized
  ? { ssl: { require: true, rejectUnauthorized: env.dbSslRejectUnauthorized } }
  : {};

const sequelize = new Sequelize(env.databaseUrl || 'postgres://postgres:postgres@localhost:5432/postgres', {
  dialect: 'postgres',
  logging: env.nodeEnv === 'development' ? console.log : false,
  // options pasado a node-postgres: corta consultas colgadas y transacciones ociosas.
  dialectOptions: {
    ...sslOptions,
    statement_timeout: 15000,
    idle_in_transaction_session_timeout: 30000,
  },
  pool: { max: 10, min: 0, acquire: env.dbStatementTimeoutMs, idle: 10000 },
});

async function testConnection() {
  await sequelize.authenticate();
}

module.exports = { sequelize, testConnection };
