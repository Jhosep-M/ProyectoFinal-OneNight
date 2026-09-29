const rateLimit = require('express-rate-limit');
const { env } = require('../config/environment');

const apiLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit excedido' },
});

module.exports = { apiLimiter };
