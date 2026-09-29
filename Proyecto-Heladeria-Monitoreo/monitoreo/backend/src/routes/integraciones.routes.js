const { Router } = require('express');
const { authenticateJWT } = require('../middlewares/auth.middleware');
const { requirePermission, scopeOrg } = require('../middlewares/rbac.middleware');
const { validateBody, validateQuery } = require('../middlewares/validation.middleware');
const { rangoSchema } = require('../validators/consulta.validator');
const { integracionCrearSchema, integracionActualizarSchema } = require('../validators/integracion.validator');
const ctrl = require('../controllers/integraciones.controller');

const router = Router();
router.use(authenticateJWT);

router.get('/', requirePermission('integracion.consultar'), scopeOrg, validateQuery(rangoSchema), ctrl.listar);
// POST lleva organizacionId en el body: el controller lo contrasta con req.orgIds.
router.post('/', requirePermission('integracion.gestionar'), validateBody(integracionCrearSchema), ctrl.crear);
router.patch('/:id', requirePermission('integracion.gestionar'), validateBody(integracionActualizarSchema), ctrl.actualizar);

module.exports = { integracionesRouter: router };
