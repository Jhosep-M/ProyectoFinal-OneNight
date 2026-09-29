const repo = require('../repositories/integraciones.repository');
const service = require('../services/integraciones.service');
const { ok, okList, fail } = require('../utils/response');
const { AppError } = require('../utils/errors');

// Regla del brief: IDs de :id validados como UUID → 400 sin filtrar existencia.
const ES_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function listar(req, res) {
  try {
    const data = await repo.listarPorOrg(req.organizacionId);
    return okList(res, data);
  } catch (e) {
    return fail(res, 500, 'Error listando integraciones', e.message);
  }
}

async function crear(req, res) {
  try {
    // Nunca confiar en el organizacionId del body: contrastarlo con la membresía.
    if (!req.orgIds.includes(req.body.organizacionId)) {
      return fail(res, 403, 'Forbidden', 'organización fuera de tu membresía');
    }
    const { integracion, apiKey } = await service.crearIntegracion(req.body, { usuarioId: req.user.id, reqId: req.id });
    return ok(res, { integracion, apiKey }, 201);
  } catch (e) {
    if (e instanceof AppError) return fail(res, e.status, e.error, e.detail);
    if (e.name === 'SequelizeUniqueConstraintError') return fail(res, 409, 'Ya existe');
    return fail(res, 500, 'Error creando integración', e.message);
  }
}

async function actualizar(req, res) {
  try {
    if (!ES_UUID.test(req.params.id)) return fail(res, 400, 'Id inválido', 'el id debe ser un UUID');
    const actual = await repo.buscarPorId(req.params.id);
    // Existente en org ajena o inexistente → 404 uniforme (no filtra existencia).
    if (!actual || !req.orgIds.includes(actual.organizacion_id)) return fail(res, 404, 'No encontrada');
    const ctx = { usuarioId: req.user.id, reqId: req.id };
    if (req.body.accion === 'rotar') {
      const { integracion, apiKey } = await service.rotarClave(actual.id, ctx);
      return ok(res, { integracion, apiKey });
    }
    const integracion = await service.cambiarEstado(actual.id, req.body.estado, ctx);
    return ok(res, integracion);
  } catch (e) {
    if (e instanceof AppError) return fail(res, e.status, e.error, e.detail);
    return fail(res, 500, 'Error actualizando integración', e.message);
  }
}

module.exports = { listar, crear, actualizar };
