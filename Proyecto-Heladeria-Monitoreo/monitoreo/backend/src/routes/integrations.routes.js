const { Router } = require('express');
const { authenticateIntegration } = require('../middlewares/authIntegration.middleware');
const { validateBody } = require('../middlewares/validation.middleware');
const { consumptionSchema } = require('../validators/integracion.validator');
const { recepcionConsumo } = require('../controllers/integrations.controller');

const router = Router();
router.post('/consumption', authenticateIntegration, validateBody(consumptionSchema), recepcionConsumo);

module.exports = { integrationsRouter: router };
