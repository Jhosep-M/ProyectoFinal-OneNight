const { sequelize } = require('../config/database');

const TIPOS = ['ingreso', 'salida', 'ajuste'];

function aplicaMovimiento({ stock, tipo, cantidad }) {
  const s = Number(stock ?? 0);
  const c = Number(cantidad);
  if (!TIPOS.includes(tipo)) throw new Error('tipo invalido: ' + tipo);
  if (!Number.isFinite(c) || c <= 0) throw new Error('cantidad invalida');
  if (tipo === 'ingreso') return s + c;
  if (tipo === 'salida') {
    const out = s - c;
    if (out < 0) throw new Error('STOCK_NEGATIVO');
    return out;
  }
  return c;
}

async function registrarMovimiento({ insumo_id = null, producto_id = null, proveedor_id = null, usuarioId, tipo, cantidad, motivo = null, transaction }) {
  if (!usuarioId) throw new Error('usuarioId requerido (JWT)');
  if (!insumo_id && !producto_id) throw new Error('insumo_id o producto_id requerido');
  if (insumo_id && producto_id) throw new Error('solo uno: insumo_id o producto_id');
  const run = async (t) => {
    const col = insumo_id ? 'id_insumo' : 'id_producto';
    const table = insumo_id ? 'insumo' : 'producto';
    const id = insumo_id || producto_id;
    const [rows] = await sequelize.query(`SELECT stock FROM ${table} WHERE ${col} = :id FOR UPDATE`, {
      replacements: { id }, transaction: t,
    });
    if (!rows[0]) throw new Error('no encontrado');
    const nuevo = aplicaMovimiento({ stock: rows[0].stock, tipo, cantidad });
    await sequelize.query(`UPDATE ${table} SET stock = :n WHERE ${col} = :id`, {
      replacements: { n: nuevo, id }, transaction: t,
    });
    const [mov] = await sequelize.query(
      `INSERT INTO movimiento_inventario (insumo_id, producto_id, proveedor_id, usuario_id, tipo, cantidad, motivo)
       VALUES (:ins, :prod, :prov, :uid, :tipo, :c, :mot) RETURNING *`,
      { replacements: { ins: insumo_id, prod: producto_id, prov: proveedor_id, uid: usuarioId, tipo, c: cantidad, mot: motivo }, transaction: t }
    );
    return { stock: nuevo, movimiento: mov[0] };
  };
  if (transaction) return run(transaction);
  return sequelize.transaction(run);
}

module.exports = { aplicaMovimiento, registrarMovimiento, TIPOS };
