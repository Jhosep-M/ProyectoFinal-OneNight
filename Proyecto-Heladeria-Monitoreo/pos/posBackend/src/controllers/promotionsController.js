const { sequelize } = require('../config/database');
async function listPromociones() {
  const [rows] = await sequelize.query(`SELECT * FROM promocion ORDER BY fecha_inicio DESC LIMIT 100`);
  return rows;
}
module.exports = { listPromociones };
