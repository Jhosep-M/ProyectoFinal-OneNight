const { Router } = require('express');
const { authenticateJWT } = require('../middlewares/authenticate');
const { authorize } = require('../middlewares/authorize');
const { businessErrorMessage } = require('../utils/dbErrors');
const salesController = require('../controllers/salesController');

const router = Router();
router.use(authenticateJWT);

router.get('/', authorize('venta.consultar'), async (req, res, next) => {
  try {
    res.json(await salesController.listar(req.query, req.user.id));
  } catch (e) {
    if (e.status === 400) return res.status(400).json({ error: e.message });
    next(e);
  }
});

router.post('/', authorize('venta.crear'), async (req, res, next) => {
  try {
    res.status(201).json(await salesController.crear(req.body, req.user.id));
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: e.errors });
    const business = businessErrorMessage(e);
    if (business) return res.status(400).json({ error: business });
    next(e);
  }
});

router.post('/:id/anular', authorize('venta.anular'), async (req, res, next) => {
  try {
    res.json(await salesController.anular(req.params.id, req.body.motivo, req.user.id));
  } catch (e) {
    if (e.status === 400) return res.status(400).json({ error: e.message });
    const msg = String((e && e.message) || '');
    if (/venta no existe/i.test(msg)) return res.status(404).json({ error: 'Venta no encontrada' });
    if (/venta no está activa/i.test(msg)) return res.status(409).json({ error: 'La venta no está activa' });
    const business = businessErrorMessage(e);
    if (business) return res.status(400).json({ error: business });
    next(e);
  }
});

module.exports = { salesRouter: router };
