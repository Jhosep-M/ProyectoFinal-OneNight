const { Router } = require('express');
const { authenticateJWT } = require('../middlewares/authenticate');
const { authorize } = require('../middlewares/authorize');
const shiftsController = require('../controllers/shiftsController');

const router = Router();
router.use(authenticateJWT);

router.get('/', authorize('turno.consultar'), async (req, res, next) => {
  try {
    res.json(await shiftsController.listar(req.user.id));
  } catch (e) { next(e); }
});

router.post('/', authorize('turno.abrir'), async (req, res, next) => {
  try {
    res.status(201).json(await shiftsController.abrir(req.body, req.user.id));
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: e.errors });
    if (e.original?.code === '23505') return res.status(409).json({ error: 'Ya tiene un turno abierto' });
    next(e);
  }
});

router.post('/:id/cerrar', authorize('turno.cerrar'), async (req, res, next) => {
  try {
    res.json(await shiftsController.cerrar(req.params.id, req.body, req.user.id));
  } catch (e) { next(e); }
});

module.exports = { shiftsRouter: router };
