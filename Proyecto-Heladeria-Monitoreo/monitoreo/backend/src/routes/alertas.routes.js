const { Router } = require('express');
const { authenticateJWT } = require('../middlewares/auth.middleware');
const { requirePermission, scopeOrg } = require('../middlewares/rbac.middleware');
const { validateQuery } = require('../middlewares/validation.middleware');
const { rangoSchema } = require('../validators/consulta.validator');
const ctrl = require('../controllers/alertas.controller');

const router = Router();
router.use(authenticateJWT);

router.get('/', requirePermission('alerta.consultar'), scopeOrg, validateQuery(rangoSchema), ctrl.listar);

module.exports = { alertasRouter: router };
