const { Router } = require('express');
const { authenticateJWT } = require('../middlewares/auth.middleware');
const { requirePermission, scopeOrg } = require('../middlewares/rbac.middleware');
const { validateBody } = require('../middlewares/validation.middleware');
const { tarifaSchema, tarifaUpdateSchema } = require('../validators/tarifa.validator');
const ctrl = require('../controllers/tarifas.controller');

const router = Router();
router.use(authenticateJWT);

router.get('/', requirePermission('tarifa.consultar'), scopeOrg, ctrl.listar);
router.post('/', requirePermission('tarifa.gestionar'), scopeOrg, validateBody(tarifaSchema), ctrl.crear);
router.patch('/:id', requirePermission('tarifa.gestionar'), scopeOrg, validateBody(tarifaUpdateSchema), ctrl.actualizar);

module.exports = { tarifasRouter: router };
