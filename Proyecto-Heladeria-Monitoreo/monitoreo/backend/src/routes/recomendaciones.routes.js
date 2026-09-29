const { Router } = require('express');
const { authenticateJWT } = require('../middlewares/auth.middleware');
const { requirePermission, scopeOrg } = require('../middlewares/rbac.middleware');
const { validateBody } = require('../middlewares/validation.middleware');
const { recomendacionSchema, recomendacionUpdateSchema } = require('../validators/recomendacion.validator');
const ctrl = require('../controllers/recomendaciones.controller');

const router = Router();
router.use(authenticateJWT);

router.get('/', requirePermission('recomendacion.consultar'), scopeOrg, ctrl.listar);
router.post('/', requirePermission('recomendacion.gestionar'), scopeOrg, validateBody(recomendacionSchema), ctrl.crear);
router.patch('/:id', requirePermission('recomendacion.gestionar'), scopeOrg, validateBody(recomendacionUpdateSchema), ctrl.actualizar);

module.exports = { recomendacionesRouter: router };
