const { Router } = require('express');
const { authenticateJWT } = require('../middlewares/auth.middleware');
const { requirePermission, scopeOrg } = require('../middlewares/rbac.middleware');
const { validateBody } = require('../middlewares/validation.middleware');
const { organizacionSchema, organizacionUpdateSchema } = require('../validators/organizacion.validator');
const ctrl = require('../controllers/organizaciones.controller');

const router = Router();
router.use(authenticateJWT);

router.get('/', requirePermission('organizacion.consultar'), ctrl.listar);
router.get('/:id', requirePermission('organizacion.consultar'), ctrl.obtener);
router.post('/', requirePermission('organizacion.gestionar'), validateBody(organizacionSchema), ctrl.crear);
router.patch('/:id', requirePermission('organizacion.gestionar'), validateBody(organizacionUpdateSchema), ctrl.actualizar);

module.exports = { organizacionesRouter: router };
