const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const { env } = require('../config/environment');

function keyFromReq(req) {
  const auth = req.headers.authorization || '';
  const m = /^Bearer (.+)$/i.exec(auth);
  if (m) {
    try {
      const payloadB64 = String(m[1]).split('.')[1];
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf8'));
      const sub = payload.sub || payload.user_id || payload.userId;
      if (sub) return `u:${sub}`;
    } catch {
      /* cae a IP */
    }
  }
  return ipKeyGenerator(req.ip);
}

function tooManyHandler() {
  return (req, res, _next, options) => {
    // Retry-After real: tiempo restante de la ventana, no la ventana completa.
    let retryAfterSec = Math.ceil((options.windowMs || env.rateLimitWindowMs) / 1000);
    try {
      const reset = req.rateLimit && req.rateLimit.resetTime;
      const ms = reset instanceof Date ? reset.getTime() - Date.now() : NaN;
      if (Number.isFinite(ms) && ms > 0) {
        retryAfterSec = Math.min(retryAfterSec, Math.max(1, Math.ceil(ms / 1000)));
      }
    } catch {
      /* fallback a ventana completa */
    }
    res.set('Retry-After', String(retryAfterSec));
    res.status(options.statusCode || 429).json({
      error: 'Rate limit excedido',
      code: 'RATE_LIMITED',
      retryAfterSec,
    });
  };
}

const writeLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  limit: env.rateLimitMax,
  max: env.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyFromReq,
  skip: (req) => req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS',
  handler: tooManyHandler(),
});

const readLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  limit: env.rateLimitReadMax,
  max: env.rateLimitReadMax,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyFromReq,
  skip: (req) => !(req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS'),
  handler: tooManyHandler(),
});

// Compat: antes todo /api usaba apiLimiter (estricto). Ahora equivale a escritura.
const apiLimiter = writeLimiter;

module.exports = { apiLimiter, writeLimiter, readLimiter };
