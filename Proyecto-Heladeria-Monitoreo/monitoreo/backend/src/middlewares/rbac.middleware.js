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
function scopeOrg(req, res, next) {
  if (!req.orgIds?.length) return res.status(403).json({ error: 'Forbidden', detail: 'sin organización activa' });
  const pedido = req.query?.organizacionId;
  if (!pedido) {
    req.organizacionId = req.orgIds[0];
    return next();
  }
  if (!req.orgIds.includes(pedido)) {
    return res.status(403).json({ error: 'Forbidden', detail: 'organización fuera de tu membresía' });
  }
  req.organizacionId = pedido;
  next();
}

module.exports = { requirePermission, scopeOrg };
