'use strict';

const { sequelize } = require('../config/database');

// Solo-admin estricto: verifica rol.nombre='admin' desde la DB usando el
// id del JWT (req.user.id). Nunca confía en datos del body/query.
async function requireAdmin(req, res, next) {
  const user = req.user;
  if (!user || !user.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const [rows] = await sequelize.query(
      `SELECT lower(r.nombre) AS rol
       FROM usuario u
       JOIN rol r ON r.id_rol = u.rol_id
       WHERE u.id_usuario = :uid`,
      { replacements: { uid: user.id } }
    );
    if (!rows[0] || rows[0].rol !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return next();
  } catch (e) {
    return res.status(500).json({ error: 'Internal error' });
  }
}

module.exports = { requireAdmin };
