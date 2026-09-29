const { sequelize } = require('../config/database');
async function listPedidos() {
  const [rows] = await sequelize.query(`SELECT * FROM pedido ORDER BY fecha DESC LIMIT 100`);
  return rows;
}
module.exports = { listPedidos };
