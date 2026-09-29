const { Router } = require('express');
const { sequelize } = require('../config/database');

const router = Router();

// Readiness real: verifica conexion a DB. K8s debe apuntar aqui.
router.get('/', async (_req, res) => {
  try {
    await sequelize.query('SELECT 1');
    res.json({ ok: true, service: 'pos-backend', db: 'up', ts: new Date().toISOString() });
  } catch (_e) {
    res.status(503).json({ ok: false, service: 'pos-backend', db: 'down' });
  }
});

module.exports = { healthRouter: router };
