const { Router } = require('express');
const { authenticateJWT } = require('../middlewares/auth.middleware');
const { requirePermission } = require('../middlewares/rbac.middleware');
const { validateBody } = require('../middlewares/validation.middleware');
const { notificacionVistaSchema } = require('../validators/consulta.validator');
const ctrl = require('../controllers/notificaciones.controller');

const router = Router();
router.use(authenticateJWT);

// Sin scopeOrg: lista las suyas + broadcast de TODAS sus orgs.
router.get('/', requirePermission('notificacion.consultar'), ctrl.listar);
router.patch('/:id', requirePermission('notificacion.consultar'), validateBody(notificacionVistaSchema), ctrl.actualizar);

module.exports = { notificacionesRouter: router };
