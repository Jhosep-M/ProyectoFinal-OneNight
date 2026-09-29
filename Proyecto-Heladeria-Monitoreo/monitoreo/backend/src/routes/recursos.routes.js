const { Router } = require('express');
const { authenticateJWT } = require('../middlewares/auth.middleware');
const { requirePermission } = require('../middlewares/rbac.middleware');
const { validateBody } = require('../middlewares/validation.middleware');
const { recursoSchema } = require('../validators/recurso.validator');
const ctrl = require('../controllers/recursos.controller');

const router = Router();
router.use(authenticateJWT);

// El plan menciona 'recurso.consultar' para GET, pero el seed (Task 2) solo crea
// 'recurso.gestionar' (grep en database/monitoreo: no existe recurso.consultar).
// Usar el permiso inexistente devolvería 403 para todos los roles, incluido admin.
router.get('/', requirePermission('recurso.gestionar'), ctrl.listar);
router.post('/', requirePermission('recurso.gestionar'), validateBody(recursoSchema), ctrl.crear);

module.exports = { recursosRouter: router };
