const { sequelize } = require('../config/database');

/**
 * Service devolucion — delega a funciones PG SECURITY DEFINER.
 * No confiar en precio/stock del frontend; PG restaura producto + insumos receta + MovimientoInventario + auditoria.
 */

/**
 * Procesa devolucion delegando a public.procesar_devolucion.
 * @param {string} venta_id - UUID venta origen
 * @param {string} producto_id - UUID producto
 * @param {number} cantidad - cantidad a devolver (int positivo)
 * @param {string} motivo - motivo devolucion
 * @param {string} userId - usuario que autoriza/procesa (JWT, requiere devolucion.autorizar)
 * @returns {Promise<object>} resultado PG (id_devolucion, monto, etc.)
 */
async function procesar(venta_id, producto_id, cantidad, motivo, userId) {
  const [rows] = await sequelize.query(
    'SELECT public.procesar_devolucion(:venta,:producto,:cantidad,:uid,:motivo) as result',
    {
      replacements: { venta: venta_id, producto: producto_id, cantidad, motivo, uid: userId },
    }
  );
  const row = rows && rows[0];
  return row ? row.result ?? row : row;
}

module.exports = { procesar };
