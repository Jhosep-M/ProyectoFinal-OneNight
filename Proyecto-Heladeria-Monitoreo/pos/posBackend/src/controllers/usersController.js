const { sequelize } = require('../config/database');
const { auditLog } = require('../utils/audit');
// thin wrapper: delega a DB, usado por routes/users.js si se prefiere capa controller
async function listUsers() {
  const [rows] = await sequelize.query(`SELECT id_usuario, nombre, email, rol_id, estado, creado_en FROM usuario ORDER BY creado_en DESC LIMIT 100`);
  return rows;
}
async function getUser(id) {
  const [rows] = await sequelize.query(`SELECT * FROM usuario WHERE id_usuario=:id`, { replacements: { id } });
  return rows[0] || null;
}
module.exports = { listUsers, getUser };
