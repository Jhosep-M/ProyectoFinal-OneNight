const { Router } = require('express');
const { authenticateJWT } = require('../middlewares/auth.middleware');
const { requirePermission, scopeOrg } = require('../middlewares/rbac.middleware');
const { validateBody } = require('../middlewares/validation.middleware');
const { metaSchema, metaUpdateSchema } = require('../validators/meta.validator');
const ctrl = require('../controllers/metas.controller');

const router = Router();
router.use(authenticateJWT);

router.get('/', requirePermission('meta.consultar'), scopeOrg, ctrl.listar);
router.post('/', requirePermission('meta.gestionar'), scopeOrg, validateBody(metaSchema), ctrl.crear);
router.patch('/:id', requirePermission('meta.gestionar'), scopeOrg, validateBody(metaUpdateSchema), ctrl.actualizar);
router.delete('/:id', requirePermission('meta.gestionar'), scopeOrg, ctrl.eliminar);

module.exports = { metasRouter: router };
