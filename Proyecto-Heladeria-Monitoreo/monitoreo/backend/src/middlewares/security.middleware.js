const helmet = require('helmet');
const cors = require('cors');
const { env } = require('../config/environment');

const securityHeaders = helmet({
  contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], objectSrc: ["'none'"] } },
  hsts: { maxAge: 31536000, includeSubDomains: true },
  noSniff: true,
  xssFilter: true,
  hidePoweredBy: true,
});

const corsMiddleware = cors({ origin: env.corsOrigin, credentials: true });

module.exports = { securityHeaders, corsMiddleware };
