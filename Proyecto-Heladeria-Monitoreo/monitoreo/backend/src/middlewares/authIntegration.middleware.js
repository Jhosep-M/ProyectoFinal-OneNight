const crypto = require('crypto');
const { Integracion } = require('../models');
const { AppError } = require('../utils/errors');

// Auth por API key: se hashea lo recibido (sha256) y se busca por hash.
// Jamás se compara ni guarda el texto plano de la key.
async function authenticateIntegration(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing API key' });
    }
    const hash = crypto.createHash('sha256').update(header.slice(7)).digest('hex');
    const integ = await Integracion.findOne({ where: { api_key_hash: hash, estado: 'activo' } });
    const tiempoSeguro = integ && crypto.timingSafeEqual(Buffer.from(integ.api_key_hash), Buffer.from(hash));
    if (!tiempoSeguro) return res.status(401).json({ error: 'Invalid API key' });
    req.integracion = integ;
    next();
  } catch (e) {
    next(new AppError(500, 'Auth de integración fallida', e.message));
  }
}

module.exports = { authenticateIntegration };
