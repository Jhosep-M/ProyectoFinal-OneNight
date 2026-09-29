const { sequelize } = require('../config/database');
async function listCola(estado = 'pendiente', limit = 50) {
  const [rows] = await sequelize.query(`SELECT * FROM cola_integracion WHERE estado=:estado ORDER BY creado_en ASC LIMIT :limit`, { replacements: { estado, limit } });
  return rows;
}
module.exports = { listCola };
