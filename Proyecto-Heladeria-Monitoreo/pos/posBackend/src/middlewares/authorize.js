'use strict';

const { sequelize } = require('../config/database');

function authorize(permiso) {
  return async (req, res, next) => {
    const user = req.user;
    if (!user || !user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
      const [rows] = await sequelize.query(
        'SELECT usuario_tiene_permiso(:uid, :perm) AS has_perm',
        { replacements: { uid: user.id, perm: permiso } }
      );
      const has = rows && rows[0] && rows[0].has_perm;
      // 403 genérico: NO devolver el nombre del permiso requerido ni
      // cuál falta, para no filtrar el mapa de permisos al atacante.
      if (!has) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      return next();
    } catch (e) {
      // Mensaje genérico: no exponer detail interno al cliente.
      return res.status(500).json({ error: 'Internal error' });
    }
  };
}

// Alias: authorize() y requirePermission() son el mismo middleware factory.
const requirePermission = authorize;

module.exports = { authorize, requirePermission };
