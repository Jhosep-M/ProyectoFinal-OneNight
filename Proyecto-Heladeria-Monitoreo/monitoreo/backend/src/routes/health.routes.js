const { Router } = require('express');
const router = Router();
router.get('/', (_req, res) => res.json({ ok: true, service: 'monitoreo-backend', ts: new Date().toISOString() }));
module.exports = { healthRouter: router };
