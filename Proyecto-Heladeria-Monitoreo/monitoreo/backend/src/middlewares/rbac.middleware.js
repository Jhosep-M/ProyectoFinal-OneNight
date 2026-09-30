const { sequelize } = require('../config/database');

// Verifica el permiso en algún rol activo del usuario y setea req.orgIds
// (organizaciones activas donde el usuario posee ese permiso).
function requirePermission(permiso) {
  return async (req, res, next) => {
    const user = req.user;
    if (!user?.id) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const [rows] = await sequelize.query(
        `SELECT DISTINCT uo.organizacion_id
           FROM usuario u
           JOIN usuario_organizacion uo ON uo.usuario_id = u.id AND uo.estado = 'activo'
           JOIN rol r ON r.id = uo.rol_id AND r.estado = 'activo'
           JOIN rol_permiso rp ON rp.rol_id = r.id
           JOIN permiso p ON p.id = rp.permiso_id
          WHERE u.id = :uid AND u.estado = 'activo' AND p.nombre = :perm`,
        { replacements: { uid: user.id, perm: permiso } },
      );
      if (!rows.length) return res.status(403).json({ error: 'Forbidden', permiso });
      req.orgIds = rows.map((r) => r.organizacion_id);
      next();
    } catch (e) {
      return res.status(500).json({ error: 'RBAC check failed', detail: e.message });
    }
  };
}

// Tras requirePermission: resuelve req.organizacionId validando membership.
// ESTRICTO (Fase 3): sin fallback silencioso a req.orgIds[0]. Sin
// ?organizacionId en lecturas → 400 OrganizacionId requerido.
// Excepciones para no romper escrituras existentes:
//  - POST con organizacionId en el body: se valida contra la membresía.
//  - Rutas con :id (PATCH/DELETE): el controller contrasta req.orgIds con la
//    fila real (404 uniforme si es ajena); scopeOrg solo deja pasar.
function scopeOrg(req, res, next) {
  if (!req.orgIds?.length) return res.status(403).json({ error: 'Forbidden', detail: 'sin organización activa' });
  const pedidoQuery = req.query?.organizacionId;
  if (pedidoQuery) {
    if (!req.orgIds.includes(pedidoQuery)) {
      return res.status(403).json({ error: 'Forbidden', detail: 'organización fuera de tu membresía' });
    }
    req.organizacionId = pedidoQuery;
    return next();
  }
  if (req.params?.id) return next();
  const pedidoBody = req.body?.organizacionId;
  if (pedidoBody) {
    if (!req.orgIds.includes(pedidoBody)) {
      return res.status(403).json({ error: 'Forbidden', detail: 'organización fuera de tu membresía' });
    }
    req.organizacionId = pedidoBody;
    return next();
  }
  return res.status(400).json({ error: 'OrganizacionId requerido', detail: 'query organizacionId es obligatorio' });
}

module.exports = { requirePermission, scopeOrg };
