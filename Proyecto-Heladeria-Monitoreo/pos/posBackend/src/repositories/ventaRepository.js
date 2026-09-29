const { sequelize } = require('../config/database');

/**
 * Bloquea y retorna venta por PK.
 * @param {string} id - id_venta UUID
 * @param {import('sequelize').Transaction} transaction
 * @returns {Promise<object|undefined>}
 */
async function findByIdForUpdate(id, transaction) {
  const [rows] = await sequelize.query(
    'SELECT * FROM venta WHERE id_venta = :id FOR UPDATE',
    { replacements: { id }, transaction }
  );
  return rows[0];
}

/**
 * Bloquea venta por idempotency_key (previene doble insert).
 */
async function findByIdempotencyKeyForUpdate(key, transaction) {
  const [rows] = await sequelize.query(
    'SELECT * FROM venta WHERE idempotency_key = :key FOR UPDATE',
    { replacements: { key }, transaction }
  );
  return rows[0];
}

/**
 * Bloquea detalles de venta (uso en devoluciones).
 */
async function findDetallesForUpdate(ventaId, transaction) {
  const [rows] = await sequelize.query(
    'SELECT * FROM detalle_venta WHERE venta_id = :ventaId FOR UPDATE',
    { replacements: { ventaId }, transaction }
  );
  return rows;
}

module.exports = {
  findByIdForUpdate,
  findByIdempotencyKeyForUpdate,
  findDetallesForUpdate,
};
