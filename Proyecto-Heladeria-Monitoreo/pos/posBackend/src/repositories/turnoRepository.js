const { sequelize } = require('../config/database');

/**
 * Busca turno abierto del usuario con lock pesimista.
 * Usa índice parcial ux_turno_abierto WHERE estado='abierto'.
 * @param {string} uid - usuario_id UUID
 * @param {import('sequelize').Transaction} transaction
 * @returns {Promise<object|undefined>}
 */
async function findOpenByUser(uid, transaction) {
  const [rows] = await sequelize.query(
    "SELECT * FROM turno_caja WHERE usuario_id = :uid AND estado = 'abierto' FOR UPDATE",
    { replacements: { uid }, transaction }
  );
  return rows[0];
}

/**
 * Bloquea turno por id.
 */
async function findByIdForUpdate(id, transaction) {
  const [rows] = await sequelize.query(
    'SELECT * FROM turno_caja WHERE id_turno = :id FOR UPDATE',
    { replacements: { id }, transaction }
  );
  return rows[0];
}

/**
 * Variante con SKIP LOCKED útil para workers concurrentes.
 */
async function findOpenByUserSkipLocked(uid, transaction) {
  const [rows] = await sequelize.query(
    "SELECT * FROM turno_caja WHERE usuario_id = :uid AND estado = 'abierto' FOR UPDATE SKIP LOCKED",
    { replacements: { uid }, transaction }
  );
  return rows[0];
}

module.exports = {
  findOpenByUser,
  findByIdForUpdate,
  findOpenByUserSkipLocked,
};
