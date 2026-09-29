const { sequelize } = require('../config/database');
async function listConfig() {
  const [rows] = await sequelize.query(`SELECT * FROM configuracion_pos ORDER BY clave`);
  return rows;
}
module.exports = { listConfig };
