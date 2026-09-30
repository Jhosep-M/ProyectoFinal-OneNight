const { sequelize } = require('../config/database');

function calculaRequerimientos(receta, cantidad) {
  const n = Number(cantidad);
  return (receta || []).map((r) => ({
    insumo_id: r.insumo_id,
    cantidad: Number(r.cantidad_requerida) * n,
  }));
}

async function runInTx(fn, outer) {
  if (outer) return fn(outer);
  return sequelize.transaction(fn);
}

async function descontarInsumosReceta(productoId, cantidad, opts = {}) {
  if (!productoId) throw new Error('productoId requerido');
  if (!Number.isFinite(Number(cantidad)) || Number(cantidad) <= 0) throw new Error('cantidad invalida');
  const { transaction, usuarioId = null, ventaId = null, motivo = 'venta' } = opts;
  if (!usuarioId) throw new Error('usuarioId requerido (JWT)');
  return runInTx(async (t) => {
    const [receta] = await sequelize.query(
      `SELECT ri.insumo_id, ri.cantidad_requerida, i.stock
       FROM receta_insumo ri JOIN insumo i ON i.id_insumo = ri.insumo_id
       WHERE ri.producto_id = :pid ORDER BY ri.insumo_id FOR UPDATE`,
      { replacements: { pid: productoId }, transaction: t }
    );
    if (receta.length === 0) return [];
    const reqs = calculaRequerimientos(receta, Number(cantidad));
    for (let i = 0; i < receta.length; i++) {
      if (Number(receta[i].stock) < reqs[i].cantidad) {
        throw new Error('STOCK_INSUFICIENTE: ' + receta[i].insumo_id);
      }
    }
    for (const r of reqs) {
      await sequelize.query(`UPDATE insumo SET stock = stock - :c WHERE id_insumo = :id`, {
        replacements: { c: r.cantidad, id: r.insumo_id }, transaction: t,
      });
      await sequelize.query(
        `INSERT INTO movimiento_inventario (insumo_id, producto_id, usuario_id, venta_id, tipo, cantidad, motivo)
         VALUES (:ins, :prod, :uid, :venta, 'venta', :c, :mot)`,
        { replacements: { ins: r.insumo_id, prod: productoId, uid: usuarioId, venta: ventaId, c: r.cantidad, mot: motivo }, transaction: t }
      );
    }
    return reqs;
  }, transaction);
}

async function reintegrarInsumosReceta(productoId, cantidad, opts = {}) {
  if (!productoId) throw new Error('productoId requerido');
  if (!Number.isFinite(Number(cantidad)) || Number(cantidad) <= 0) throw new Error('cantidad invalida');
  const { transaction, usuarioId = null, devolucionId = null, motivo = 'devolucion', tipo = 'devolucion' } = opts;
  if (!usuarioId) throw new Error('usuarioId requerido (JWT)');
  if (!['devolucion', 'anulacion'].includes(tipo)) throw new Error('tipo invalido');
  return runInTx(async (t) => {
    const [receta] = await sequelize.query(
      `SELECT ri.insumo_id, ri.cantidad_requerida FROM receta_insumo ri
       WHERE ri.producto_id = :pid ORDER BY ri.insumo_id FOR UPDATE`,
      { replacements: { pid: productoId }, transaction: t }
    );
    if (receta.length === 0) return [];
    const reqs = calculaRequerimientos(receta, Number(cantidad));
    for (const r of reqs) {
      await sequelize.query(`UPDATE insumo SET stock = stock + :c WHERE id_insumo = :id`, {
        replacements: { c: r.cantidad, id: r.insumo_id }, transaction: t,
      });
      await sequelize.query(
        `INSERT INTO movimiento_inventario (insumo_id, producto_id, usuario_id, devolucion_id, tipo, cantidad, motivo)
         VALUES (:ins, :prod, :uid, :dev, :tipo, :c, :mot)`,
        { replacements: { ins: r.insumo_id, prod: productoId, uid: usuarioId, dev: devolucionId, tipo, c: r.cantidad, mot: motivo }, transaction: t }
      );
    }
    return reqs;
  }, transaction);
}

module.exports = { calculaRequerimientos, descontarInsumosReceta, reintegrarInsumosReceta };
