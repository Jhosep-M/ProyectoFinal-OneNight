const { sequelize } = require('../config/database');
async function listCustomers() {
  const [rows] = await sequelize.query(`SELECT * FROM cliente ORDER BY creado_en DESC LIMIT 100`);
  return rows;
}
module.exports = { listCustomers };
