const { Sequelize } = require('sequelize');
const { env } = require('./env');

const sequelize = new Sequelize(env.databaseUrl || 'postgres://postgres:postgres@localhost:5432/postgres', {
  dialect: 'postgres',
  logging: env.nodeEnv === 'development' ? console.log : false,
  dialectOptions: env.nodeEnv === 'production' ? { ssl: { require: true, rejectUnauthorized: false } } : {},
  pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
});

async function testConnection() {
  await sequelize.authenticate();
}

module.exports = { sequelize, testConnection };
