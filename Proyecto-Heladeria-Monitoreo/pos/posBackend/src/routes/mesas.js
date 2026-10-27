const { Router } = require('express');
const { authenticateJWT } = require('../middlewares/authenticate');
const { authorize } = require('../middlewares/authorize');
const { sequelize } = require('../config/database');
const { auditLog } = require('../utils/audit');
const { createMesaSchema, updateMesaSchema } = require('../validators/mesas');
const { cuentaAbiertaPorMesa, tieneCuentaPendiente } = require('../services/mesaService');

const router = Router();
router.use(authenticateJWT);

// NOTA: requiere permiso 'mesa.consultar' (seed pendiente de Persona 4,
// igual que pedido.*/pago.*). Sin el seed, authorize responde 403.
router.get('/', authorize('mesa.consultar'), async (_req, res, next) => {
  try {
    const [rows] = await sequelize.query(
      `SELECT m.*,
        (SELECT COUNT(*)::int FROM pedido p
          WHERE p.mesa_id = m.id_mesa AND p.estado NOT IN ('cerrado','cancelado')) AS pedidos_abiertos,
        COALESCE((SELECT SUM(dp.cantidad * dp.precio_unitario) FROM detalle_pedido dp
          JOIN pedido p ON p.id_pedido = dp.pedido_id
          WHERE p.mesa_id = m.id_mesa AND p.estado NOT IN ('cerrado','cancelado')), 0) AS cuenta_total,
        (SELECT u.nombre FROM pedido p LEFT JOIN usuario u ON u.id_usuario = p.mesero_id
          WHERE p.mesa_id = m.id_mesa AND p.estado NOT IN ('cerrado','cancelado')
          ORDER BY p.fecha DESC LIMIT 1) AS mesero_nombre,
       (SELECT MIN(p.fecha) FROM pedido p
           WHERE p.mesa_id = m.id_mesa AND p.estado NOT IN ('cerrado','cobrado','cancelado')) AS abierto_desde
        FROM mesa m WHERE m.estado <> 'inactiva' ORDER BY numero`
    );
    res.json(rows);
  } catch (e) { next(e); }
});

router.get('/:id', authorize('mesa.consultar'), async (req, res, next) => {
  try {
    const [rows] = await sequelize.query(`SELECT * FROM mesa WHERE id_mesa=:id`, {
      replacements: { id: req.params.id },
    });
    if (!rows[0]) return res.status(404).json({ error: 'Mesa no encontrada' });
    const [pedidos] = await sequelize.query(
      `SELECT p.*, u.nombre AS mesero_nombre,
        COALESCE((SELECT SUM(cantidad * precio_unitario) FROM detalle_pedido WHERE pedido_id = p.id_pedido), 0) AS total
       FROM pedido p
       LEFT JOIN usuario u ON u.id_usuario = p.mesero_id
       WHERE p.mesa_id=:id AND p.estado NOT IN ('cerrado','cancelado')
       ORDER BY p.fecha DESC`,
      { replacements: { id: req.params.id } }
    );
    res.json({ ...rows[0], pedidos });
  } catch (e) { next(e); }
});

router.post('/', authorize('mesa.gestionar'), async (req, res, next) => {
  try {
    const parsed = createMesaSchema.parse(req.body);
    const numero = parsed.numero !== undefined ? parsed.numero : Number(parsed.nombre);
    if (!Number.isInteger(numero) || numero <= 0) {
      return res.status(400).json({ error: 'numero debe ser entero > 0' });
    }
    // Opción A: el frontend calcula max+1 solo con visibles (el GET
    // filtra inactivas), así que el número pedido puede estar ocupado por
    // una inactiva. En ese caso se reactiva en vez de responder 409.
    // Si lo ocupa una mesa activa, 409 sin intentar el INSERT.
    // El catch 23505 se conserva como red de seguridad ante carreras.
    const [existente] = await sequelize.query(
      `SELECT * FROM mesa WHERE numero=:numero`,
      { replacements: { numero } }
    );
    if (existente[0]) {
      if (existente[0].estado === 'inactiva') {
        const [rows] = await sequelize.query(
          `UPDATE mesa SET estado='libre' WHERE id_mesa=:id RETURNING *`,
          { replacements: { id: existente[0].id_mesa } }
        );
        await auditLog({
          usuario_id: req.user.id, accion: 'mesa.reactivar', entidad: 'mesa',
          entidad_id: rows[0].id_mesa, resultado: 'exito', detalle: { numero },
          ip: req.ip, userAgent: req.headers['user-agent'],
        });
        return res.json(rows[0]);
      }
      return res.status(409).json({ error: 'Número de mesa duplicado' });
    }
    const [rows] = await sequelize.query(
      `INSERT INTO mesa (numero, estado) VALUES (:numero, 'libre') RETURNING *`,
      { replacements: { numero } }
    );
    await auditLog({
      usuario_id: req.user.id, accion: 'mesa.crear', entidad: 'mesa',
      entidad_id: rows[0].id_mesa, resultado: 'exito', detalle: { numero },
      ip: req.ip, userAgent: req.headers['user-agent'],
    });
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: e.errors });
    if (e.original?.code === '23505' || e.parent?.code === '23505') {
      return res.status(409).json({ error: 'Número de mesa duplicado' });
    }
    next(e);
  }
});

// PATCH /:id — cambiar estado (liberar/ocupar/reservar).
// Guard: pasar a 'libre' con pedidos abiertos o cuenta pendiente
// responde 409 — la cuenta se cierra cobrando el pedido, no liberando
// la mesa a mano (el cobro ya libera la mesa automáticamente).
router.patch('/:id', authorize('mesa.gestionar'), async (req, res, next) => {
  try {
    const parsed = updateMesaSchema.parse({ estado: String(req.body.estado || '').trim().toLowerCase() });
    const normalizado = parsed.estado === 'disponible' ? 'libre' : parsed.estado;
    if (normalizado === 'libre') {
      const cuenta = await cuentaAbiertaPorMesa(req.params.id);
      if (tieneCuentaPendiente(cuenta)) {
        return res.status(409).json({ error: 'Mesa con pedidos abiertos o cuenta pendiente, cobra antes de liberar' });
      }
    }
    const [rows] = await sequelize.query(
      `UPDATE mesa SET estado=:estado WHERE id_mesa=:id RETURNING *`,
      { replacements: { estado: normalizado, id: req.params.id } }
    );
    if (!rows[0]) return res.status(404).json({ error: 'Mesa no encontrada' });
    await auditLog({
      usuario_id: req.user.id, accion: 'mesa.actualizar', entidad: 'mesa',
      entidad_id: req.params.id, resultado: 'exito', detalle: { estado: normalizado },
      ip: req.ip, userAgent: req.headers['user-agent'],
    });
    res.json(rows[0]);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'estado debe ser libre, ocupada o reservada' });
    next(e);
  }
});

// DELETE /:id — soft-delete: inactiva la mesa (preserva historial de
// pedidos/ventas; DOC HU-15: con pedidos abiertos no se elimina).
// Con pedidos abiertos o cuenta pendiente responde 409.
router.delete('/:id', authorize('mesa.gestionar'), async (req, res, next) => {
  try {
    const cuenta = await cuentaAbiertaPorMesa(req.params.id);
    if (tieneCuentaPendiente(cuenta)) {
      return res.status(409).json({ error: 'Mesa con pedidos abiertos o cuenta pendiente, cobra antes de eliminar' });
    }
    const [rows] = await sequelize.query(
      `UPDATE mesa SET estado='inactiva' WHERE id_mesa=:id AND estado <> 'inactiva' RETURNING *`,
      { replacements: { id: req.params.id } }
    );
    if (!rows[0]) return res.status(404).json({ error: 'Mesa no encontrada' });
    await auditLog({
      usuario_id: req.user.id, accion: 'mesa.eliminar', entidad: 'mesa',
      entidad_id: req.params.id, resultado: 'exito', detalle: { numero: rows[0].numero },
      ip: req.ip, userAgent: req.headers['user-agent'],
    });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

module.exports = { mesasRouter: router };
