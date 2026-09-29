const { sequelize } = require('../config/database');

/**
 * Service turno — delega a funciones PG SECURITY DEFINER.
 */

/**
 * Cierra turno delegando a public.cerrar_turno.
 * @param {string} turno_id - UUID turno_caja
 * @param {number} monto - monto_final_real (NUMERIC >=0)
 * @returns {Promise<object>} JSONB result de cerrar_turno (ventas, esperado, diferencia, consumos, alertas)
 */
async function cerrar(turno_id, monto) {
  if (monto === null || monto === undefined || typeof monto !== 'number' || monto < 0) {
    throw new Error('monto_final_real debe ser >= 0');
  }
  const [rows] = await sequelize.query('SELECT public.cerrar_turno(:id::uuid, :monto) as result', {
    replacements: { id: turno_id, monto },
  });
  const row = rows && rows[0];
  return row ? row.result ?? row : row;
}

/**
 * Abre turno simple (INSERT directo) — usado fuera de PG function.
 * Mantiene índice parcial ux_turno_abierto; conflicto 23505 si ya tiene turno abierto.
 * @param {string} userId
 * @param {number} monto_inicial
 * @returns {Promise<object>} turno creado
 */
async function abrir(userId, monto_inicial) {
  if (monto_inicial === null || monto_inicial === undefined || typeof monto_inicial !== 'number' || monto_inicial < 0) {
    throw new Error('monto_inicial debe ser >= 0');
  }
  const [rows] = await sequelize.query(
    "INSERT INTO turno_caja (usuario_id, monto_inicial, estado) VALUES (:uid, :monto, 'abierto') RETURNING *",
    { replacements: { uid: userId, monto: monto_inicial } }
  );
  return rows[0];
}

module.exports = { cerrar, abrir };
