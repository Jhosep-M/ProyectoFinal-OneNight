const { sequelize } = require('../config/database');
async function listInsumos() {
  const [rows] = await sequelize.query(`SELECT * FROM insumo ORDER BY nombre LIMIT 100`);
  return rows;
}
async function listMovimientos() {
  const [rows] = await sequelize.query(`SELECT * FROM movimiento_inventario ORDER BY fecha DESC LIMIT 100`);
  return rows;
}
module.exports = { listInsumos, listMovimientos };
