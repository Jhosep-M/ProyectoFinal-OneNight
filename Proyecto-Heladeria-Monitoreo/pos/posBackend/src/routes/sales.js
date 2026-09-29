const { Router } = require('express');
const { authenticateJWT } = require('../middlewares/authenticate');
const { authorize } = require('../middlewares/authorize');
const { registrarVentaSchema } = require('../validators/sales');
const { sequelize } = require('../config/database');
const ventaService = require('../services/ventaService');

const router = Router();
router.use(authenticateJWT);

router.get('/', authorize('venta.consultar'), async (_req, res) => {
  const [rows] = await sequelize.query(`SELECT * FROM venta ORDER BY fecha DESC LIMIT 50`);
  res.json(rows);
});

router.post('/', authorize('venta.crear'), async (req, res, next) => {
  try {
    const parsed = registrarVentaSchema.parse(req.body);
    const userId = req.user.id;
    const venta_id = await ventaService.crear({
      turno_id: parsed.turno_id,
      items: parsed.items,
      pagos: parsed.pagos,
      userId,
      cliente_id: parsed.cliente_id,
      descuento: parsed.descuento,
    });
    res.status(201).json({ venta_id });
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: e.errors });
    next(e);
  }
});

router.post('/:id/anular', authorize('venta.anular'), async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { motivo } = req.body;
    if (!motivo || motivo.trim().length < 5) return res.status(400).json({ error: 'motivo requerido >=5 chars' });
    await ventaService.anular(req.params.id, motivo, userId);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = { salesRouter: router };
