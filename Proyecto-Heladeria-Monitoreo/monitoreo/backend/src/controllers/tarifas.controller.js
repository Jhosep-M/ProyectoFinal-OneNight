const repo = require('../repositories/tarifas.repository');
const service = require('../services/tarifas.service');
const { ok, okList, fail } = require('../utils/response');
const { AppError } = require('../utils/errors');

// Regla del brief: IDs de :id validados como UUID → 400 sin filtrar existencia.
const ES_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function listar(req, res) {
  try {
    const data = await repo.listarPorOrg(req.organizacionId);
    return okList(res, data);
  } catch (e) {
    return fail(res, 500, 'Error listando tarifas', e.message);
  }
}

async function crear(req, res) {
  try {
    // organizacionId opcional (ausente = tarifa global); si viene, debe ser de la membresía.
    if (req.body.organizacionId && !req.orgIds.includes(req.body.organizacionId)) {
      return fail(res, 403, 'Forbidden', 'organización fuera de tu membresía');
    }
    const tarifa = await service.crearTarifa(req.body, { usuarioId: req.user.id, reqId: req.id });
    return ok(res, tarifa, 201);
  } catch (e) {
    if (e instanceof AppError) return fail(res, e.status, e.error, e.detail);
    if (e.name === 'SequelizeUniqueConstraintError') return fail(res, 409, 'Ya existe');
    return fail(res, 500, 'Error creando tarifa', e.message);
  }
}

async function actualizar(req, res) {
  try {
    if (!ES_UUID.test(req.params.id)) return fail(res, 400, 'Id inválido', 'el id debe ser un UUID');
    const actual = await repo.buscarPorId(req.params.id);
    // Global (organizacion_id NULL) sin tenant propio → editable con el permiso;
    // de otra org o inexistente → 404 uniforme (no filtra existencia).
    const propiedadOk = actual && (!actual.organizacion_id || req.orgIds.includes(actual.organizacion_id));
    if (!propiedadOk) return fail(res, 404, 'No encontrada');
    const tarifa = await service.actualizarTarifa(actual.id, req.body, { usuarioId: req.user.id, reqId: req.id });
    return ok(res, tarifa);
  } catch (e) {
    if (e instanceof AppError) return fail(res, e.status, e.error, e.detail);
    return fail(res, 500, 'Error actualizando tarifa', e.message);
  }
}

module.exports = { listar, crear, actualizar };
