const { Router } = require('express');
const { authenticateJWT } = require('../middlewares/auth.middleware');
const { requirePermission, scopeOrg } = require('../middlewares/rbac.middleware');
const { validateQuery } = require('../middlewares/validation.middleware');
const { rangoSchema } = require('../validators/consulta.validator');
const ctrl = require('../controllers/reportes.controller');

const router = Router();
router.use(authenticateJWT);

router.get('/consumo', requirePermission('reporte.consultar'), scopeOrg, validateQuery(rangoSchema), ctrl.consumo);
router.get('/top-excesos', requirePermission('reporte.consultar'), scopeOrg, validateQuery(rangoSchema), ctrl.topExcesos);

module.exports = { reportesRouter: router };
