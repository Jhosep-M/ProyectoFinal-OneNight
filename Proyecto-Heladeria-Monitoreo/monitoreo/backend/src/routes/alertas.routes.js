const { Router } = require('express');
const { authenticateJWT } = require('../middlewares/auth.middleware');
const { requirePermission, scopeOrg } = require('../middlewares/rbac.middleware');
const { validateBody, validateQuery } = require('../middlewares/validation.middleware');
const { rangoSchema } = require('../validators/consulta.validator');
const { alertaPruebaSchema } = require('../validators/alerta.validator');
const ctrl = require('../controllers/alertas.controller');

const router = Router();
router.use(authenticateJWT);

router.get('/', requirePermission('alerta.consultar'), scopeOrg, validateQuery(rangoSchema), ctrl.listar);

// Disparo manual de alertas (demo Monitoreo -> POS). Requiere alerta.gestionar.
// /prueba: organizacionId viaja en el body; validateBody lo sanea antes de que
// scopeOrg lo valide contra la membresia del usuario.
router.post('/prueba', requirePermission('alerta.gestionar'), validateBody(alertaPruebaSchema), scopeOrg, ctrl.crearPrueba);
// /:id/reenviar: scopeOrg deja pasar (hay :id); el controller valida pertenencia.
router.post('/:id/reenviar', requirePermission('alerta.gestionar'), scopeOrg, ctrl.reenviar);

module.exports = { alertasRouter: router };
