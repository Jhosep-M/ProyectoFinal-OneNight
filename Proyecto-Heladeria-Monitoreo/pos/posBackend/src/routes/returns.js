const { Router } = require('express');
const { z } = require('zod');
const { authenticateJWT } = require('../middlewares/authenticate');
const { authorize } = require('../middlewares/authorize');
const { sequelize } = require('../config/database');
const devolucionService = require('../services/devolucionService');
const { auditLog } = require('../utils/audit');

const router = Router();
router.use(authenticateJWT);

const createDevolucionSchema = z.object({
  venta_id: z.string().uuid(),
  producto_id: z.string().uuid(),
  cantidad: z.number().positive('cantidad debe ser > 0'),
  motivo: z.string().trim().min(5, 'motivo >=5 chars').max(500),
});

router.get('/', authorize('devolucion.consultar'), async (_req, res, next) => {
  try {
    const [rows] = await sequelize.query(`SELECT d.*, p.nombre as producto_nombre, v.fecha as venta_fecha FROM devolucion d LEFT JOIN producto p ON p.id_producto=d.producto_id LEFT JOIN venta v ON v.id_venta=d.venta_id ORDER BY d.fecha DESC LIMIT 100`);
    res.json(rows);
  } catch (e) { next(e); }
});

router.get('/:id', authorize('devolucion.consultar'), async (req, res, next) => {
  try {
    const [rows] = await sequelize.query(`SELECT * FROM devolucion WHERE id_devolucion=:id`, { replacements: { id: req.params.id } });
    if (!rows[0]) return res.status(404).json({ error: 'Devolución no encontrada' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

// POST /api/v1/returns -> delega a PG public.procesar_devolucion via service
router.post('/', authorize('devolucion.procesar'), async (req, res, next) => {
  try {
    const parsed = createDevolucionSchema.parse(req.body);
    const userId = req.user.id;
    const result = await devolucionService.procesar(parsed.venta_id, parsed.producto_id, parsed.cantidad, parsed.motivo, userId);
    await auditLog({ usuario_id: userId, accion: 'devolucion.procesar', entidad: 'devolucion', entidad_id: result?.id_devolucion || null, resultado: 'exito', detalle: parsed, ip: req.ip, userAgent: req.headers['user-agent'] });
    res.status(201).json(result);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: e.errors });
    next(e);
  }
});

module.exports = { returnsRouter: router };
