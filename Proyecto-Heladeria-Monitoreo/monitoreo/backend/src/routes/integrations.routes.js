// integrations (inglés, singular de sistema): API máquina-a-máquina POS→Monitoreo.
// Auth por API key propia (authenticateIntegration, header Authorization Bearer),
// SIN JWT ni RBAC. Solo POST /consumption (contrato §6). NO confundir con
// integraciones.routes.js (CRUD JWT de credenciales).
const { Router } = require('express');
const { authenticateIntegration } = require('../middlewares/authIntegration.middleware');
const { validateBody } = require('../middlewares/validation.middleware');
const { consumptionSchema } = require('../validators/integracion.validator');
const { recepcionConsumo } = require('../controllers/integrations.controller');

const router = Router();
router.post('/consumption', authenticateIntegration, validateBody(consumptionSchema), recepcionConsumo);

module.exports = { integrationsRouter: router };
