const repo = require('../repositories/metas.repository');
const service = require('../services/metas.service');
const { ok, okList, fail } = require('../utils/response');
const { AppError } = require('../utils/errors');

// Regla del brief: IDs de :id validados como UUID → 400 sin filtrar existencia.
const ES_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function listar(req, res) {
  try {
<<<<<<< HEAD
    const data = await repo.listarPorOrg(req.organizacionId);
=======
    const incluirInactivos = req.query.incluirInactivos === '1';
    const data = incluirInactivos
      ? await repo.listarPorOrg(req.organizacionId)
      : await repo.listarActivosPorOrg(req.organizacionId);
>>>>>>> origin/feature/Airton-auxilio
    return okList(res, data);
  } catch (e) {
    return fail(res, 500, 'Error listando metas', e.message);
  }
}

async function crear(req, res) {
  try {
    // Nunca confiar en el organizacionId del body: contrastarlo con la membresía.
    if (!req.orgIds.includes(req.body.organizacionId)) {
      return fail(res, 403, 'Forbidden', 'organización fuera de tu membresía');
    }
    const meta = await service.crearMeta(req.body, { usuarioId: req.user.id, reqId: req.id });
    return ok(res, meta, 201);
  } catch (e) {
    if (e instanceof AppError) return fail(res, e.status, e.error, e.detail);
    if (e.name === 'SequelizeUniqueConstraintError') return fail(res, 409, 'Ya existe');
    return fail(res, 500, 'Error creando meta', e.message);
  }
}

async function actualizar(req, res) {
  try {
    if (!ES_UUID.test(req.params.id)) return fail(res, 400, 'Id inválido', 'el id debe ser un UUID');
    const actual = await repo.buscarPorId(req.params.id);
    // Existente en org ajena o inexistente → 404 uniforme (no filtra existencia).
    if (!actual || !req.orgIds.includes(actual.organizacion_id)) return fail(res, 404, 'No encontrada');
    const meta = await service.actualizarMeta(actual.id, req.body, { usuarioId: req.user.id, reqId: req.id });
    return ok(res, meta);
  } catch (e) {
    if (e instanceof AppError) return fail(res, e.status, e.error, e.detail);
    return fail(res, 500, 'Error actualizando meta', e.message);
  }
}

<<<<<<< HEAD
module.exports = { listar, crear, actualizar };
=======
async function eliminar(req, res) {
  try {
    if (!ES_UUID.test(req.params.id)) return fail(res, 400, 'Id inválido', 'el id debe ser un UUID');
    const actual = await repo.buscarPorId(req.params.id);
    if (!actual || !req.orgIds.includes(actual.organizacion_id)) return fail(res, 404, 'No encontrada');
    const meta = await service.actualizarMeta(actual.id, { estado: 'inactivo' }, { usuarioId: req.user.id, reqId: req.id });
    return ok(res, meta);
  } catch (e) {
    if (e instanceof AppError) return fail(res, e.status, e.error, e.detail);
    return fail(res, 500, 'Error eliminando meta', e.message);
  }
}

module.exports = { listar, crear, actualizar, eliminar };
>>>>>>> origin/feature/Airton-auxilio
