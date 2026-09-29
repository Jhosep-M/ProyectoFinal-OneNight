const { sequelize } = require('../config/database');

/**
 * Bloquea y retorna fila producto con FOR UPDATE.
 * @param {string} id - id_producto UUID
 * @param {import('sequelize').Transaction} transaction
 * @returns {Promise<object|undefined>}
 */
async function findProductoForUpdate(id, transaction) {
  const [rows] = await sequelize.query(
    'SELECT * FROM producto WHERE id_producto = :id FOR UPDATE',
    { replacements: { id }, transaction }
  );
  return rows[0];
}

/**
 * Alias semántico idéntico — usado por algunos services.
 */
async function findByIdForUpdate(id, transaction) {
  return findProductoForUpdate(id, transaction);
}

/**
 * Bloqueo múltiple opcional (útil en registrar_venta con varios items).
 * Ordena ids para evitar deadlocks.
 */
async function findManyForUpdate(ids, transaction) {
  if (!ids || ids.length === 0) return [];
  const sorted = [...ids].sort();
  const [rows] = await sequelize.query(
    'SELECT * FROM producto WHERE id_producto IN (:ids) ORDER BY id_producto FOR UPDATE',
    { replacements: { ids: sorted }, transaction }
  );
  return rows;
}

module.exports = {
  findProductoForUpdate,
  findByIdForUpdate,
  findManyForUpdate,
};
