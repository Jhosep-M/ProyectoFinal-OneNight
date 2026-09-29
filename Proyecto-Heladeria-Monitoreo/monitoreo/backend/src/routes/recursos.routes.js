const { Router } = require('express');
const { authenticateJWT } = require('../middlewares/auth.middleware');
const { requirePermission } = require('../middlewares/rbac.middleware');
const { validateBody } = require('../middlewares/validation.middleware');
const { recursoSchema } = require('../validators/recurso.validator');
const ctrl = require('../controllers/recursos.controller');

const router = Router();
router.use(authenticateJWT);

// GET lista tipos de recurso (tabla semilla agua/energia): lectura para todos
// los roles vía 'recurso.consultar' (ver database/monitoreo/003_*).
// POST crea tipos nuevos: solo gestión.
router.get('/', requirePermission('recurso.consultar'), ctrl.listar);
router.post('/', requirePermission('recurso.gestionar'), validateBody(recursoSchema), ctrl.crear);

module.exports = { recursosRouter: router };
