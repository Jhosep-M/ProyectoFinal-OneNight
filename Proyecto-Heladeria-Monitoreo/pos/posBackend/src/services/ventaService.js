const { sequelize } = require('../config/database');

/**
 * Service delega 100% a funciones PG SECURITY DEFINER.
 * No confiar en precio del frontend — PG valida precio/stock con FOR UPDATE.
 */

/**
 * Crea venta delegando a public.registrar_venta.
 * @param {object} params
 * @param {string} params.turno_id - UUID turno_caja abierto
 * @param {Array<{producto_id:string,cantidad:number}>} params.items
 * @param {Array<{metodo_pago_id:string,monto:number,referencia?:string}>} params.pagos
 * @param {string} params.userId - auth user id (JWT)
 * @param {string|null} [params.cliente_id] - cliente opcional
 * @param {number} [params.descuento] - descuento total (>=0, validado en PG)
 * @param {number} [params.puntos_canje] - puntos a canjear (1 punto = $1, descuenta del total antes de validar pagos; requiere cliente_id)
 * @param {string} [params.idempotencyKey] - clave opcional; ausente -> NULL
 *   (PG UNIQUE permite múltiples NULL; registrar_venta crea fila nueva, compat histórica).
 * @returns {Promise<string>} venta_id UUID
 */
async function crear({ turno_id, items, pagos, userId, cliente_id, descuento, puntos_canje, idempotencyKey }) {
  const [result] = await sequelize.query(
    'SELECT public.registrar_venta(:uid,:turno,:cliente,:items::jsonb,:desc,:pagos::jsonb,:idem,:canje) as venta_id',
    {
      replacements: {
        uid: userId,
        turno: turno_id,
        cliente: cliente_id || null,
        items: JSON.stringify(items),
        desc: descuento ?? 0,
        pagos: JSON.stringify(pagos),
        idem: idempotencyKey || null,
        canje: puntos_canje ?? 0,
      },
    }
  );
  const row = result && result[0];
  if (!row) return row;
  return row.venta_id !== undefined ? row.venta_id : row;
}

/**
 * Anula venta delegando a public.anular_venta.
 * @param {string} venta_id - UUID venta
 * @param {string} motivo - motivo anulacion >=5 chars (validado en ruta/validator)
 * @param {string} userId - quien anula (JWT)
 * @returns {Promise<void>}
 */
async function anular(venta_id, motivo, userId) {
  await sequelize.query('SELECT public.anular_venta(:venta,:uid,:motivo)', {
    replacements: { venta: venta_id, uid: userId, motivo },
  });
}

module.exports = { crear, anular };
