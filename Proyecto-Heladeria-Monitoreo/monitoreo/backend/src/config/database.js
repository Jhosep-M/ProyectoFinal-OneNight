const { Sequelize } = require('sequelize');
const { env } = require('./environment');

const sslOpts = env.nodeEnv === 'production' ? { ssl: { require: true, rejectUnauthorized: false } } : {};

// En tests, MONITOREO_TEST_DATABASE_URL manda (su valor debe usarse, no solo
// existir como guardia de presencia); en dev/prod se usa DATABASE_URL.
const databaseUrl = process.env.MONITOREO_TEST_DATABASE_URL
  || env.databaseUrl
  || 'postgres://postgres:postgres@localhost:5432/postgres';

const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  logging: env.nodeEnv === 'development' ? console.log : false,
  pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
  // search_path: SIN espacios ni ", public" (tokenización server-side del startup options)
  dialectOptions: { ...sslOpts, options: `-c search_path=${env.dbSchema}` },
});

async function testConnection() {
  await sequelize.authenticate();
}

module.exports = { sequelize, testConnection };
