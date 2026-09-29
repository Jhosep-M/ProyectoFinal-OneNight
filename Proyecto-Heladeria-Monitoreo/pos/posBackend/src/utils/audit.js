const { sequelize } = require('../config/database');

async function auditLog({ usuario_id, accion, entidad, entidad_id, resultado, detalle, ip, userAgent }) {
  try {
    await sequelize.query(
      `INSERT INTO auditoria_accion (usuario_id, accion, entidad, entidad_id, resultado, direccion_ip, user_agent, detalle)
       VALUES (:usuario_id, :accion, :entidad, :entidad_id, :resultado, :ip::inet, :ua, :detalle::jsonb)`,
      { replacements: { usuario_id, accion, entidad, entidad_id: entidad_id || null, resultado, ip: ip || null, ua: userAgent || null, detalle: detalle ? JSON.stringify(detalle) : null } }
    );
  } catch (e) { console.error('auditLog failed', e); }
}

module.exports = { auditLog };
