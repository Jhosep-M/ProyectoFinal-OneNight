const { sequelize } = require('../config/database');
async function listAuditoria({ limit = 50, offset = 0, accion, entidad }) {
  const repl = { limit, offset };
  const where = [];
  if (accion) { where.push('accion=:accion'); repl.accion = accion; }
  if (entidad) { where.push('entidad=:entidad'); repl.entidad = entidad; }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await sequelize.query(`SELECT * FROM auditoria_accion ${whereSql} ORDER BY fecha DESC LIMIT :limit OFFSET :offset`, { replacements: repl });
  return rows;
}
module.exports = { listAuditoria };
