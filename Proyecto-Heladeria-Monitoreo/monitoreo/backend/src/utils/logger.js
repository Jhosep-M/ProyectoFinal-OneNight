const pino = require('pino');
const { env } = require('../config/environment');

const logger = pino({
  level: env.nodeEnv === 'test' ? 'silent' : 'info',
  base: { service: 'monitoreo-backend' },
});

module.exports = { logger };
