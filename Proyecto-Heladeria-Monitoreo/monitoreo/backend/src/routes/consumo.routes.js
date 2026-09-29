const { Router } = require('express');
const { authenticateJWT } = require('../middlewares/auth.middleware');
const { requirePermission, scopeOrg } = require('../middlewares/rbac.middleware');
const { validateQuery } = require('../middlewares/validation.middleware');
const { rangoSchema } = require('../validators/consulta.validator');
const ctrl = require('../controllers/consumo.controller');

const router = Router();
router.use(authenticateJWT);

router.get('/', requirePermission('consumo.consultar'), scopeOrg, validateQuery(rangoSchema), ctrl.listar);

module.exports = { consumoRouter: router };
