const { sequelize } = require('../config/database');
async function listAuditoria({ limit = 50, offset = 0, accion, entidad }) {
  const repl = { limit, offset };
  const where = [];
  if (accion) { where.push('a.accion=:accion'); repl.accion = accion; }
  if (entidad) { where.push('a.entidad=:entidad'); repl.entidad = entidad; }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await sequelize.query(`SELECT a.*, u.nombre AS usuario_nombre, u.email AS usuario_email FROM auditoria_accion a LEFT JOIN usuario u ON u.id_usuario = a.usuario_id ${whereSql} ORDER BY a.fecha DESC LIMIT :limit OFFSET :offset`, { replacements: repl });
  return rows;
}
module.exports = { listAuditoria };
