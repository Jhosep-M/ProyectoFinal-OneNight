const { Router } = require('express');
const { authenticateJWT } = require('../middlewares/auth.middleware');
const { requirePermission, scopeOrg } = require('../middlewares/rbac.middleware');
const ctrl = require('../controllers/usuarios.controller');

const router = Router();
router.use(authenticateJWT);

router.get('/', requirePermission('usuario.gestionar'), scopeOrg, ctrl.listar);

module.exports = { usuariosRouter: router };
