const { Router } = require('express');
const { authenticateJWT } = require('../middlewares/auth.middleware');
const { requirePermission, scopeOrg } = require('../middlewares/rbac.middleware');
const { validateBody } = require('../middlewares/validation.middleware');
const { usuarioOrganizacionSchema, usuarioOrganizacionUpdateSchema } = require('../validators/usuarioOrganizacion.validator');
const ctrl = require('../controllers/usuariosOrganizacion.controller');

const router = Router();
router.use(authenticateJWT);

router.post('/', requirePermission('usuario.gestionar'), scopeOrg, validateBody(usuarioOrganizacionSchema), ctrl.crear);
router.patch('/:id', requirePermission('usuario.gestionar'), validateBody(usuarioOrganizacionUpdateSchema), ctrl.actualizar);

module.exports = { usuariosOrganizacionRouter: router };
