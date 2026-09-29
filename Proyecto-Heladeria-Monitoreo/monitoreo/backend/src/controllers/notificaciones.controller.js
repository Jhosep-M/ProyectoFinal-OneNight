const repo = require('../repositories/notificaciones.repository');
const { ok, okList, fail } = require('../utils/response');
const { AppError } = require('../utils/errors');

// Regla del brief: IDs de :id validados como UUID → 400 sin filtrar existencia.
const ES_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function listar(req, res) {
  try {
    const data = await repo.listarParaUsuario(req.user.id, req.orgIds);
    return okList(res, data);
  } catch (e) {
    return fail(res, 500, 'Error listando notificaciones', e.message);
  }
}

async function actualizar(req, res) {
  try {
    if (!ES_UUID.test(req.params.id)) return fail(res, 400, 'Id inválido', 'el id debe ser un UUID');
    const n = await repo.buscarPorId(req.params.id);
    // Alerta de org ajena o inexistente → 404 uniforme (no filtra existencia).
    if (!n || !n.alerta || !req.orgIds.includes(n.alerta.organizacion_id)) {
      return fail(res, 404, 'No encontrada');
    }
    // Propia o broadcast (NULL) de su org; la de otro usuario → 403.
    if (n.usuario_id !== null && n.usuario_id !== req.user.id) {
      return fail(res, 403, 'Forbidden', 'la notificación no te pertenece');
    }
    const vista = await repo.marcarVista(n.id);
    return ok(res, vista);
  } catch (e) {
    if (e instanceof AppError) return fail(res, e.status, e.error, e.detail);
    return fail(res, 500, 'Error actualizando notificación', e.message);
  }
}

module.exports = { listar, actualizar };
