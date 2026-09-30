const { Router } = require('express');
const { authenticateJWT } = require('../middlewares/auth.middleware');
const { requirePermission, scopeOrg } = require('../middlewares/rbac.middleware');
const { validateQuery } = require('../middlewares/validation.middleware');
const { rangoSchema } = require('../validators/consulta.validator');
const ctrl = require('../controllers/auditoria.controller');

const router = Router();
router.use(authenticateJWT);

// Permiso: no existe 'auditoria.*' en seeds (002_seed_dev.sql); se reutiliza
// 'reporte.consultar' (admin/operador/observador lo tienen) para no dejar 403
// a todos los roles. Si a futuro se crea 'auditoria.consultar', cambiar aquí.
router.get('/', requirePermission('reporte.consultar'), scopeOrg, validateQuery(rangoSchema), ctrl.listar);

module.exports = { auditoriaRouter: router };
