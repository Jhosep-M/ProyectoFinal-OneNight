const { sequelize } = require('../config/database');
const { cerrarTurnoSchema, abrirTurnoSchema } = require('../validators/shifts');
const turnoService = require('../services/turnoService');

/**
 * Controller turnos — capa fina routes → controllers → services.
 * Opción A: turno por cajero estricto. listarMios solo propios;
 * listarTodos solo con turno.consultar.todos e incluye dueño.
 */

/** Mis turnos — nunca filtra por permiso global. */
async function listarMios(userId) {
  const [rows] = await sequelize.query(
    'SELECT tc.*, u.email AS cajero_email FROM turno_caja tc LEFT JOIN usuario u ON u.id_usuario = tc.usuario_id WHERE tc.usuario_id = :uid ORDER BY tc.fecha_apertura DESC',
    { replacements: { uid: userId } }
  );
  return rows;
}

/** Todos los turnos — la ruta ya exige turno.consultar.todos. */
async function listarTodos() {
  const [rows] = await sequelize.query(
    'SELECT tc.*, u.email AS cajero_email FROM turno_caja tc LEFT JOIN usuario u ON u.id_usuario = tc.usuario_id ORDER BY tc.fecha_apertura DESC'
  );
  return rows;
}

/** Permisos propios para que la UI decida qué mostrar. */
async function permisos(userId) {
  const [rows] = await sequelize.query(
    'SELECT usuario_tiene_permiso(:uid, :p1) AS puede_cerrar_todos, usuario_tiene_permiso(:uid, :p2) AS puede_consultar_todos',
    { replacements: { uid: userId, p1: 'turno.cerrar.todos', p2: 'turno.consultar.todos' } }
  );
  const row = rows && rows[0];
  return {
    puedeCerrarTodos: !!(row && (row.puede_cerrar_todos ?? row.puedeCerrarTodos)),
    puedeConsultarTodos: !!(row && (row.puede_consultar_todos ?? row.puedeConsultarTodos)),
  };
}

/** Compat histórico: antes devolvía todos si tenía permiso global. */
async function listar(userId) {
  return listarMios(userId);
}

async function abrir(body, userId) {
  const parsed = abrirTurnoSchema.parse(body);
  return turnoService.abrir(userId, parsed.monto_inicial);
}

async function cerrar(turnoId, body, userId) {
  const parsed = cerrarTurnoSchema.parse(body);
  return turnoService.cerrar(turnoId, parsed.monto_final_real, userId);
}

module.exports = { listar, listarMios, listarTodos, permisos, abrir, cerrar };
