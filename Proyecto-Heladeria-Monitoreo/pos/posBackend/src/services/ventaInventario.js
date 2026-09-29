const { sequelize } = require('../config/database');
const { descontarInsumosReceta, reintegrarInsumosReceta } = require('./recetaService');

function checkBase({ productoId, cantidad, usuarioId }) {
  if (!productoId) throw new Error('productoId requerido');
  if (!Number.isFinite(Number(cantidad)) || Number(cantidad) <= 0) throw new Error('cantidad invalida');
  if (!usuarioId) throw new Error('usuarioId requerido (JWT)');
}

function runOuter(fn, transaction) {
  if (transaction) return fn(transaction);
  return sequelize.transaction(fn);
}

// P1 la llama dentro/fuera de su tx de venta: descuenta producto + insumos + trazabilidad.
async function aplicarVentaAInventario({ productoId, cantidad, usuarioId, ventaId = null, motivo = 'venta', transaction }) {
  checkBase({ productoId, cantidad, usuarioId });
  return runOuter(async (t) => {
    const [rows] = await sequelize.query(`SELECT stock FROM producto WHERE id_producto = :id FOR UPDATE`, {
      replacements: { id: productoId }, transaction: t,
    });
    if (!rows[0]) throw new Error('producto no encontrado');
    const nuevo = Number(rows[0].stock) - Number(cantidad);
    if (nuevo < 0) throw new Error('STOCK_NEGATIVO');
    await sequelize.query(`UPDATE producto SET stock = :n WHERE id_producto = :id`, {
      replacements: { n: nuevo, id: productoId }, transaction: t,
    });
    await sequelize.query(
      `INSERT INTO movimiento_inventario (producto_id, usuario_id, venta_id, tipo, cantidad, motivo)
       VALUES (:prod, :uid, :venta, 'venta', :c, :mot)`,
      { replacements: { prod: productoId, uid: usuarioId, venta: ventaId, c: cantidad, mot: motivo }, transaction: t }
    );
    const insumos = await descontarInsumosReceta(productoId, cantidad, { transaction: t, usuarioId, ventaId, motivo });
    return { productoStock: nuevo, insumos };
  }, transaction);
}

// Anulación: restaura producto + insumos con tipo 'anulacion'.
async function revertirAnulacionAInventario({ productoId, cantidad, usuarioId, ventaId = null, motivo = 'anulacion', transaction }) {
  checkBase({ productoId, cantidad, usuarioId });
  return runOuter(async (t) => {
    await sequelize.query(`SELECT stock FROM producto WHERE id_producto = :id FOR UPDATE`, {
      replacements: { id: productoId }, transaction: t,
    });
    await sequelize.query(`UPDATE producto SET stock = stock + :c WHERE id_producto = :id`, {
      replacements: { c: cantidad, id: productoId }, transaction: t,
    });
    await sequelize.query(
      `INSERT INTO movimiento_inventario (producto_id, usuario_id, venta_id, tipo, cantidad, motivo)
       VALUES (:prod, :uid, :venta, 'anulacion', :c, :mot)`,
      { replacements: { prod: productoId, uid: usuarioId, venta: ventaId, c: cantidad, mot: motivo }, transaction: t }
    );
    const insumos = await reintegrarInsumosReceta(productoId, cantidad, { transaction: t, usuarioId, motivo, tipo: 'anulacion' });
    return { insumos };
  }, transaction);
}

// Devolución parcial/total: restaura proporcional con tipo 'devolucion'.
async function aplicarDevolucionAInventario({ productoId, cantidad, usuarioId, devolucionId = null, motivo = 'devolucion', transaction }) {
  checkBase({ productoId, cantidad, usuarioId });
  return runOuter(async (t) => {
    await sequelize.query(`SELECT stock FROM producto WHERE id_producto = :id FOR UPDATE`, {
      replacements: { id: productoId }, transaction: t,
    });
    await sequelize.query(`UPDATE producto SET stock = stock + :c WHERE id_producto = :id`, {
      replacements: { c: cantidad, id: productoId }, transaction: t,
    });
    await sequelize.query(
      `INSERT INTO movimiento_inventario (producto_id, usuario_id, devolucion_id, tipo, cantidad, motivo)
       VALUES (:prod, :uid, :dev, 'devolucion', :c, :mot)`,
      { replacements: { prod: productoId, uid: usuarioId, dev: devolucionId, c: cantidad, mot: motivo }, transaction: t }
    );
    const insumos = await reintegrarInsumosReceta(productoId, cantidad, { transaction: t, usuarioId, devolucionId, motivo });
    return { insumos };
  }, transaction);
}

module.exports = { aplicarVentaAInventario, revertirAnulacionAInventario, aplicarDevolucionAInventario };
