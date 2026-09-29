const { Router } = require('express');
const { authenticateJWT } = require('../middlewares/auth.middleware');
const { requirePermission, scopeOrg } = require('../middlewares/rbac.middleware');
const { validateBody } = require('../middlewares/validation.middleware');
const { medidorSchema, medidorUpdateSchema } = require('../validators/medidor.validator');
const ctrl = require('../controllers/medidores.controller');

const router = Router();
router.use(authenticateJWT);

router.get('/', requirePermission('medidor.consultar'), scopeOrg, ctrl.listar);
router.post('/', requirePermission('medidor.gestionar'), scopeOrg, validateBody(medidorSchema), ctrl.crear);
router.patch('/:id', requirePermission('medidor.gestionar'), validateBody(medidorUpdateSchema), ctrl.actualizar);
<<<<<<< HEAD
=======
router.delete('/:id', requirePermission('medidor.gestionar'), scopeOrg, ctrl.eliminar);
>>>>>>> origin/feature/Airton-auxilio

module.exports = { medidoresRouter: router };
