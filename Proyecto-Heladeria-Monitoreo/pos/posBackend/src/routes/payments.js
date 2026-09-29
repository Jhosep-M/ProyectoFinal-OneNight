const { Router } = require('express');
const { authenticateJWT } = require('../middlewares/authenticate');
const { authorize } = require('../middlewares/authorize');
const { createPagoSchema } = require('../validators/payments');
const { sequelize } = require('../config/database');
const { auditLog } = require('../utils/audit');

const router = Router();
router.use(authenticateJWT);

router.get('/metodos', authorize('pago.consultar'), async (_req, res, next) => {
  try {
    const [rows] = await sequelize.query(`SELECT * FROM metodo_pago WHERE estado='activo' ORDER BY nombre`);
    res.json(rows);
  } catch (e) { next(e); }
});

router.get('/', authorize('pago.consultar'), async (req, res, next) => {
  try {
    const ventaId = req.query.venta_id;
    if (ventaId) {
      const [rows] = await sequelize.query(`SELECT p.*, mp.nombre as metodo_nombre FROM pago p LEFT JOIN metodo_pago mp ON mp.id_metodo_pago=p.metodo_pago_id WHERE p.venta_id=:venta ORDER BY p.fecha DESC`, { replacements: { venta: ventaId } });
      return res.json(rows);
    }
    const [rows] = await sequelize.query(`SELECT p.*, mp.nombre as metodo_nombre FROM pago p LEFT JOIN metodo_pago mp ON mp.id_metodo_pago=p.metodo_pago_id ORDER BY p.fecha DESC LIMIT 100`);
    res.json(rows);
  } catch (e) { next(e); }
});

router.get('/:id', authorize('pago.consultar'), async (req, res, next) => {
  try {
    const [rows] = await sequelize.query(`SELECT p.*, mp.nombre as metodo_nombre FROM pago p LEFT JOIN metodo_pago mp ON mp.id_metodo_pago=p.metodo_pago_id WHERE p.id_pago=:id`, { replacements: { id: req.params.id } });
    if (!rows[0]) return res.status(404).json({ error: 'Pago no encontrado' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

router.post('/', authorize('pago.gestionar'), async (req, res, next) => {
  try {
    const parsed = createPagoSchema.parse(req.body);
    // Conciliacion: solo ventas activas con turno abierto (no descuadrar).
    const [ventas] = await sequelize.query(
      `SELECT id_venta, estado, turno_id FROM venta WHERE id_venta=:venta`,
      { replacements: { venta: parsed.venta_id } }
    );
    if (!ventas[0]) return res.status(404).json({ error: 'Venta no encontrada' });
    if (ventas[0].estado !== 'activa') {
      return res.status(400).json({ error: 'Venta no activa' });
    }
    const [turnos] = await sequelize.query(
      `SELECT estado FROM turno_caja WHERE id_turno=:turno`,
      { replacements: { turno: ventas[0].turno_id } }
    );
    if (!turnos[0] || turnos[0].estado !== 'abierto') {
      return res.status(400).json({ error: 'Turno de la venta no abierto' });
    }
    const [rows] = await sequelize.query(
      `INSERT INTO pago (venta_id, metodo_pago_id, monto, referencia, estado) VALUES (:venta, :metodo, :monto, :ref, :estado) RETURNING *`,
      { replacements: { venta: parsed.venta_id, metodo: parsed.metodo_pago_id, monto: parsed.monto, ref: parsed.referencia || null, estado: parsed.estado } }
    );
    await auditLog({ usuario_id: req.user.id, accion: 'pago.crear', entidad: 'pago', entidad_id: rows[0].id_pago, resultado: 'exito', detalle: parsed, ip: req.ip, userAgent: req.headers['user-agent'] });
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: e.errors });
    next(e);
  }
});

module.exports = { paymentsRouter: router };
