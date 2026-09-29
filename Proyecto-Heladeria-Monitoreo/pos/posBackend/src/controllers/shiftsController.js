const { sequelize } = require('../config/database');
const { cerrarTurnoSchema } = require('../validators/sales');
const { abrirTurnoSchema } = require('../validators/shifts');
const turnoService = require('../services/turnoService');

/**
 * Controller turnos — capa fina routes → controllers → services.
 * cerrarTurnoSchema vive en validators/sales (histórico); se reutiliza sin duplicar.
 */

async function listar(userId) {
  const [rows] = await sequelize.query(
    "SELECT * FROM turno_caja WHERE usuario_id = :uid OR EXISTS (SELECT 1 FROM usuario u JOIN rol r ON r.id_rol=u.rol_id JOIN rol_permiso rp ON rp.rol_id=r.id_rol JOIN permiso p ON p.id_permiso=rp.permiso_id WHERE u.id_usuario=:uid AND p.nombre='turno.consultar.todos') ORDER BY fecha_apertura DESC",
    { replacements: { uid: userId } }
  );
  return rows;
}

async function abrir(body, userId) {
  const parsed = abrirTurnoSchema.parse(body);
  return turnoService.abrir(userId, parsed.monto_inicial);
}

async function cerrar(turnoId, body, userId) {
  const parsed = cerrarTurnoSchema.parse(body);
  return turnoService.cerrar(turnoId, parsed.monto_final_real, userId);
}

module.exports = { listar, abrir, cerrar };
