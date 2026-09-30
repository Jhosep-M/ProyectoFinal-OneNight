const { Router } = require('express');
const { authenticateJWT } = require('../middlewares/authenticate');
const { authorize } = require('../middlewares/authorize');
const { createOrderSchema, updateOrderSchema, cobrarPedidoSchema } = require('../validators/orders');
const { sequelize } = require('../config/database');
const { auditLog } = require('../utils/audit');

const router = Router();
router.use(authenticateJWT);

router.get('/', authorize('pedido.consultar'), async (_req, res, next) => {
  try {
    // mesa no tiene columna nombre (solo numero/estado) — usar numero.
    // pedido tampoco tiene columna total: se calcula desde detalle_pedido.
    const [rows] = await sequelize.query(`SELECT p.*, m.numero as mesa_numero, u.nombre as mesero_nombre, COALESCE((SELECT SUM(cantidad * precio_unitario) FROM detalle_pedido WHERE pedido_id = p.id_pedido), 0) AS total FROM pedido p LEFT JOIN mesa m ON m.id_mesa=p.mesa_id LEFT JOIN usuario u ON u.id_usuario=p.mesero_id ORDER BY p.fecha DESC LIMIT 100`);
    res.json(rows);
  } catch (e) { next(e); }
});

router.get('/:id', authorize('pedido.consultar'), async (req, res, next) => {
  try {
    const [rows] = await sequelize.query(`SELECT p.*, m.numero AS mesa_numero, COALESCE((SELECT SUM(cantidad * precio_unitario) FROM detalle_pedido WHERE pedido_id = p.id_pedido), 0) AS total FROM pedido p LEFT JOIN mesa m ON m.id_mesa = p.mesa_id WHERE p.id_pedido=:id`, { replacements: { id: req.params.id } });
    if (!rows[0]) return res.status(404).json({ error: 'Pedido no encontrado' });
    const [detalles] = await sequelize.query(`SELECT dp.*, pr.nombre as producto_nombre, pr.precio, (dp.cantidad * dp.precio_unitario) AS subtotal_calc FROM detalle_pedido dp LEFT JOIN producto pr ON pr.id_producto=dp.producto_id WHERE dp.pedido_id=:id`, { replacements: { id: req.params.id } });
    res.json({ ...rows[0], detalles });
  } catch (e) { next(e); }
});

router.post('/', authorize('pedido.crear'), async (req, res, next) => {
  try {
    const parsed = createOrderSchema.parse(req.body);
    const meseroId = parsed.mesero_id || req.user.id;
    const result = await sequelize.transaction(async (t) => {
      const [pedidoRows] = await sequelize.query(
        `INSERT INTO pedido (mesa_id, mesero_id, estado) VALUES (:mesa, :mesero, :estado) RETURNING *`,
        { replacements: { mesa: parsed.mesa_id || null, mesero: meseroId, estado: parsed.estado }, transaction: t }
      );
      const pedido = pedidoRows[0];
      for (const item of parsed.items) {
        const [prodRows] = await sequelize.query(`SELECT precio FROM producto WHERE id_producto=:id`, { replacements: { id: item.producto_id }, transaction: t });
        if (!prodRows[0]) throw Object.assign(new Error(`Producto no encontrado: ${item.producto_id}`), { status: 400 });
        const precio = prodRows[0].precio;
        const subtotal = Number(item.cantidad) * Number(precio);
        await sequelize.query(
          `INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario, subtotal, observacion) VALUES (:pedido, :prod, :cant, :precio, :subtotal, :obs)`,
          { replacements: { pedido: pedido.id_pedido, prod: item.producto_id, cant: item.cantidad, precio, subtotal, obs: item.observacion || parsed.observacion || null }, transaction: t }
        );
      }
      // Cuenta por mesa: crear pedido ocupa la mesa automáticamente.
      if (parsed.mesa_id) {
        await sequelize.query(
          `UPDATE mesa SET estado='ocupada' WHERE id_mesa=:mesa AND estado IN ('libre','disponible')`,
          { replacements: { mesa: parsed.mesa_id }, transaction: t }
        );
      }
      return pedido;
    });
    await auditLog({ usuario_id: req.user.id, accion: 'pedido.crear', entidad: 'pedido', entidad_id: result.id_pedido, resultado: 'exito', detalle: parsed, ip: req.ip, userAgent: req.headers['user-agent'] });
    const [detalles] = await sequelize.query(`SELECT *, (cantidad * precio_unitario) AS subtotal_calc FROM detalle_pedido WHERE pedido_id=:id`, { replacements: { id: result.id_pedido } });
    const total = detalles.reduce((acc, d) => acc + Number(d.subtotal ?? d.subtotal_calc ?? 0), 0);
    res.status(201).json({ ...result, detalles, total });
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: e.errors });
    if (e.status === 400) return res.status(400).json({ error: e.message });
    next(e);
  }
});

// POST /:id/cobrar — convierte pedido abierto en venta.
// Reutiliza public.registrar_venta (valida turno/stock/pagos con FOR UPDATE)
// y enlaza venta.pedido_id, todo en una transaccion.
router.post('/:id/cobrar', authorize('venta.crear'), async (req, res, next) => {
  try {
    const parsed = cobrarPedidoSchema.parse(req.body);
    const userId = req.user.id;
    const pedidoId = req.params.id;
    const cobrado = await sequelize.transaction(async (t) => {
      const [pedRows] = await sequelize.query(
        `SELECT * FROM pedido WHERE id_pedido=:id FOR UPDATE`,
        { replacements: { id: pedidoId }, transaction: t }
      );
      const pedido = pedRows[0];
      if (!pedido) {
        throw Object.assign(new Error('Pedido no encontrado'), { status: 404 });
      }
      if (pedido.estado === 'cerrado' || pedido.estado === 'cancelado') {
        throw Object.assign(new Error(`Pedido ya ${pedido.estado}`), { status: 409 });
      }
      const [detalles] = await sequelize.query(
        `SELECT producto_id, cantidad, precio_unitario FROM detalle_pedido WHERE pedido_id=:id`,
        { replacements: { id: pedidoId }, transaction: t }
      );
      if (!detalles.length) {
        throw Object.assign(new Error('Pedido sin items'), { status: 400 });
      }
      const items = detalles.map((d) => ({ producto_id: d.producto_id, cantidad: Number(d.cantidad) }));
      const [ventaRows] = await sequelize.query(
        `SELECT public.registrar_venta(:uid, :turno, NULL, :items::jsonb, 0, :pagos::jsonb) as venta_id`,
        {
          replacements: {
            uid: userId,
            turno: parsed.turno_id,
            items: JSON.stringify(items),
            pagos: JSON.stringify(parsed.pagos),
          },
          transaction: t,
        }
      );
      const venta_id = ventaRows[0].venta_id;
      await sequelize.query(`UPDATE venta SET pedido_id=:pedido WHERE id_venta=:venta`, {
        replacements: { pedido: pedidoId, venta: venta_id },
        transaction: t,
      });
      const [cerrado] = await sequelize.query(
        `UPDATE pedido SET estado='cerrado', fecha_cierre=NOW() WHERE id_pedido=:id RETURNING *`,
        { replacements: { id: pedidoId }, transaction: t }
      );
      // Cuenta por mesa: si era el último pedido abierto, liberar la mesa.
      if (pedido.mesa_id) {
        const [abiertos] = await sequelize.query(
          `SELECT COUNT(*)::int AS n FROM pedido WHERE mesa_id=:mesa AND estado NOT IN ('cerrado','cancelado')`,
          { replacements: { mesa: pedido.mesa_id }, transaction: t }
        );
        if (!abiertos[0] || abiertos[0].n === 0) {
          await sequelize.query(`UPDATE mesa SET estado='libre' WHERE id_mesa=:mesa`, {
            replacements: { mesa: pedido.mesa_id },
            transaction: t,
          });
        }
      }
      return { venta_id, pedido: cerrado[0] };
    });
    await auditLog({ usuario_id: userId, accion: 'pedido.cobrar', entidad: 'pedido', entidad_id: pedidoId, resultado: 'exito', detalle: { venta_id: cobrado.venta_id }, ip: req.ip, userAgent: req.headers['user-agent'] });
    res.status(201).json(cobrado);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: e.errors });
    if (e.status === 404 || e.status === 409 || e.status === 400) return res.status(e.status).json({ error: e.message });
    next(e);
  }
});

router.patch('/:id', authorize('pedido.gestionar'), async (req, res, next) => {  try {
    // Alias del flujo simplificado: el frontend envía 'cobrado' (= cerrado).
    if (req.body && req.body.estado === 'cobrado') req.body.estado = 'cerrado';
    const parsed = updateOrderSchema.parse(req.body);
    const sets = [];
    const repl = { id: req.params.id };
    if (parsed.mesa_id !== undefined) { sets.push('mesa_id=:mesa'); repl.mesa = parsed.mesa_id; }
    if (parsed.estado !== undefined) { sets.push('estado=:estado'); repl.estado = parsed.estado; }
    if (parsed.estado === 'cancelado' || parsed.estado === 'cerrado') { sets.push('fecha_cierre=NOW()'); }
    if (sets.length > 0) {
      const updatedPedido = await sequelize.transaction(async (t) => {
        const [rows] = await sequelize.query(`UPDATE pedido SET ${sets.join(', ')} WHERE id_pedido=:id RETURNING *`, { replacements: repl, transaction: t });
        if (!rows[0]) return null;
        if (parsed.items) {
          await sequelize.query(`DELETE FROM detalle_pedido WHERE pedido_id=:id`, { replacements: { id: req.params.id }, transaction: t });
          for (const item of parsed.items) {
            const [prodRows] = await sequelize.query(`SELECT precio FROM producto WHERE id_producto=:id`, { replacements: { id: item.producto_id }, transaction: t });
            if (!prodRows[0]) throw Object.assign(new Error(`Producto no encontrado: ${item.producto_id}`), { status: 400 });
            const precio = prodRows[0].precio;
            const subtotal = Number(item.cantidad) * Number(precio);
            await sequelize.query(`INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario, subtotal, observacion) VALUES (:pedido, :prod, :cant, :precio, :subtotal, :obs)`, { replacements: { pedido: req.params.id, prod: item.producto_id, cant: item.cantidad, precio, subtotal, obs: item.observacion || null }, transaction: t });
          }
        }
        return rows[0];
      });
      if (!updatedPedido) return res.status(404).json({ error: 'Pedido no encontrado' });
      // Cuenta por mesa: mover pedido a otra mesa la ocupa; cerrar/cancelar
      // el último pedido abierto libera la mesa.
      try {
        const mesaAfectada = parsed.mesa_id || updatedPedido.mesa_id;
        if (parsed.mesa_id && parsed.estado !== 'cerrado' && parsed.estado !== 'cancelado') {
          await sequelize.query(
            `UPDATE mesa SET estado='ocupada' WHERE id_mesa=:mesa AND estado IN ('libre','disponible')`,
            { replacements: { mesa: parsed.mesa_id } }
          );
        }
        if ((parsed.estado === 'cerrado' || parsed.estado === 'cancelado') && mesaAfectada) {
          const [abiertos] = await sequelize.query(
            `SELECT COUNT(*)::int AS n FROM pedido WHERE mesa_id=:mesa AND estado NOT IN ('cerrado','cancelado')`,
            { replacements: { mesa: mesaAfectada } }
          );
          if (!abiertos[0] || abiertos[0].n === 0) {
            await sequelize.query(`UPDATE mesa SET estado='libre' WHERE id_mesa=:mesa`, {
              replacements: { mesa: mesaAfectada },
            });
          }
        }
      } catch { /* no bloquear la respuesta por el sync de mesa */ }
      await auditLog({ usuario_id: req.user.id, accion: 'pedido.actualizar', entidad: 'pedido', entidad_id: req.params.id, resultado: 'exito', detalle: parsed, ip: req.ip, userAgent: req.headers['user-agent'] });
      const [updated] = await sequelize.query(`SELECT p.*, m.numero AS mesa_numero, COALESCE((SELECT SUM(cantidad * precio_unitario) FROM detalle_pedido WHERE pedido_id = p.id_pedido), 0) AS total FROM pedido p LEFT JOIN mesa m ON m.id_mesa = p.mesa_id WHERE p.id_pedido=:id`, { replacements: { id: req.params.id } });
      const [detalles] = await sequelize.query(`SELECT *, (cantidad * precio_unitario) AS subtotal_calc FROM detalle_pedido WHERE pedido_id=:id`, { replacements: { id: req.params.id } });
      return res.json({ ...updated[0], detalles });
    }
    res.json({ message: 'sin cambios' });
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: e.errors });
    if (e.status === 400) return res.status(400).json({ error: e.message });
    next(e);
  }
});

module.exports = { ordersRouter: router };
