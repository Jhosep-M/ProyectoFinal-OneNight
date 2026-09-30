const { sequelize } = require('../config/database');

// Lectura de auditoria_cambio con alcance de tenant.
// NOTA DDL v1: auditoria_cambio NO tiene columna organizacion_id. El filtro por
// organizacionId es best-effort y combina tres señales (OR):
//  1. detalle JSON (->>'organizacionId' / 'organizacion_id') cuando el escritor lo incluyó,
//  2. usuario_id miembro de la org (usuario_organizacion),
//  3. filas entidad='organizacion' cuyo entidad_id es la propia org.
// La membresía ya la garantiza requirePermission + scopeOrg; esto solo reduce ruido.
async function listar(organizacionId, { desde, hasta, page = 1, limit = 25 }) {
  const replacements = { org: organizacionId, desde: desde ?? null, hasta: hasta ?? null, limit, offset: (page - 1) * limit };
  const where = `
    WHERE (
      detalle->>'organizacionId' = :org::text
      OR detalle->>'organizacion_id' = :org::text
      OR usuario_id IN (SELECT usuario_id FROM usuario_organizacion WHERE organizacion_id = :org AND estado = 'activo')
      OR (entidad = 'organizacion' AND entidad_id = :org)
    )
    AND (:desde::date IS NULL OR creado_en::date >= :desde::date)
    AND (:hasta::date IS NULL OR creado_en::date <= :hasta::date)
  `;
  const [rows] = await sequelize.query(
    `SELECT id, entidad, entidad_id, accion, usuario_id, req_id, detalle, creado_en
       FROM auditoria_cambio ${where}
      ORDER BY creado_en DESC
      LIMIT :limit OFFSET :offset`,
    { replacements },
  );
  const [cnt] = await sequelize.query(`SELECT count(*)::int AS total FROM auditoria_cambio ${where}`, { replacements });
  return { data: rows, total: cnt[0]?.total ?? 0, page, limit };
}

module.exports = { listar };
