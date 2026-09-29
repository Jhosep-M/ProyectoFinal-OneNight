const { Router } = require('express');
const { authenticateJWT } = require('../middlewares/auth.middleware');
const { requirePermission, scopeOrg } = require('../middlewares/rbac.middleware');
const { validateBody } = require('../middlewares/validation.middleware');
const { umbralSchema, umbralUpdateSchema } = require('../validators/umbral.validator');
const ctrl = require('../controllers/umbrales.controller');

const router = Router();
router.use(authenticateJWT);

router.get('/', requirePermission('umbral.consultar'), scopeOrg, ctrl.listar);
router.post('/', requirePermission('umbral.gestionar'), scopeOrg, validateBody(umbralSchema), ctrl.crear);
router.patch('/:id', requirePermission('umbral.gestionar'), scopeOrg, validateBody(umbralUpdateSchema), ctrl.actualizar);

module.exports = { umbralesRouter: router };
