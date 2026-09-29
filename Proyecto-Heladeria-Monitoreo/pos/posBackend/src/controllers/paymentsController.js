const { sequelize } = require('../config/database');
async function listPagos(ventaId) {
  if (ventaId) {
    const [rows] = await sequelize.query(`SELECT * FROM pago WHERE venta_id=:venta ORDER BY fecha DESC`, { replacements: { venta: ventaId } });
    return rows;
  }
  const [rows] = await sequelize.query(`SELECT * FROM pago ORDER BY fecha DESC LIMIT 100`);
  return rows;
}
module.exports = { listPagos };
