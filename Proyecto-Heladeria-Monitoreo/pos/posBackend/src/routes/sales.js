const { Router } = require('express');
const { authenticateJWT } = require('../middlewares/authenticate');
const { authorize } = require('../middlewares/authorize');
const salesController = require('../controllers/salesController');

const router = Router();
router.use(authenticateJWT);

router.get('/', authorize('venta.consultar'), async (_req, res, next) => {
  try {
    res.json(await salesController.listar());
  } catch (e) { next(e); }
});

router.post('/', authorize('venta.crear'), async (req, res, next) => {
  try {
    res.status(201).json(await salesController.crear(req.body, req.user.id));
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: e.errors });
    next(e);
  }
});

router.post('/:id/anular', authorize('venta.anular'), async (req, res, next) => {
  try {
    res.json(await salesController.anular(req.params.id, req.body.motivo, req.user.id));
  } catch (e) {
    if (e.status === 400) return res.status(400).json({ error: e.message });
    next(e);
  }
});

module.exports = { salesRouter: router };
