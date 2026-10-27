const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const { env } = require('../config/env');

// Bucket por usuario (sub del JWT sin verificar, solo para agrupar)
// con fallback a IP. Evita que 2 cajeros detrás del mismo NAT/IP
// compartan contador y se bloqueen entre sí en Render.
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
      /* token malformado: cae a IP */
    }
  }
  return ipKeyGenerator(req.ip);
}

function tooManyHandler(kind) {
  return (req, res, _next, options) => {
    const retryAfterSec = Math.ceil((options.windowMs || env.rateLimitWindowMs) / 1000);
    res.set('Retry-After', String(retryAfterSec));
    res.status(options.statusCode || 429).json({
      error: kind === 'auth' ? 'Too many auth attempts' : 'Too many requests',
      code: 'RATE_LIMITED',
      retryAfterSec,
    });
  };
}

// Escrituras y resto no-GET: límite estricto histórico (100/15min).
const writeLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  limit: env.rateLimitMax,
  max: env.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyFromReq,
  skip: (req) => req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS',
  handler: tooManyHandler('api'),
});

// Lecturas idempotentes: límite generoso para polling multi-pestaña
// (Pedidos 3 req/15s + Mesas/Cocina/Ventas). Default 600/15min.
const readLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  limit: env.rateLimitReadMax,
  max: env.rateLimitReadMax,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyFromReq,
  skip: (req) => !(req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS'),
  handler: tooManyHandler('api'),
});

// Compat: antes todo /api usaba apiLimiter. Ahora equivale al de escritura.
const apiLimiter = writeLimiter;

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyFromReq,
  handler: tooManyHandler('auth'),
});

module.exports = { apiLimiter, writeLimiter, readLimiter, authLimiter };
