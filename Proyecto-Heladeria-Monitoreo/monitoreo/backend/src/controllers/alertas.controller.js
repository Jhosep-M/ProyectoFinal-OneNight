const service = require('../services/alertas.service');
const repo = require('../repositories/alertas.repository');
const { ok, okList, fail } = require('../utils/response');
const { AppError } = require('../utils/errors');

// Ids de :id validados como UUID -> 400 sin filtrar existencia (regla del brief).
const ES_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function listar(req, res) {
  try {
    const data = await service.listarAlertas(req.organizacionId, req.query);
    return okList(res, data);
  } catch (e) {
    return fail(res, 500, 'Error listando alertas', e.message);
  }
}

// POST /alertas/prueba — crea una alerta manual y la envia al POS.
// scopeOrg ya valido organizacionId del body contra la membresia.
async function crearPrueba(req, res) {
  try {
    const alerta = await service.crearAlertaManual(req.body);
    return ok(res, { data: alerta }, 201);
  } catch (e) {
    if (e instanceof AppError) return fail(res, e.status, e.error, e.detail);
    return fail(res, 500, 'Error creando alerta', e.message);
  }
}

// POST /alertas/:id/reenviar — reencola la entrega de una alerta existente.
// Existente en org ajena o inexistente -> 404 uniforme (no filtra existencia).
async function reenviar(req, res) {
  try {
    if (!ES_UUID.test(req.params.id)) return fail(res, 400, 'Id inválido', 'el id debe ser un UUID');
    const actual = await repo.obtenerPorId(req.params.id);
    if (!actual || !req.orgIds.includes(actual.organizacion_id)) return fail(res, 404, 'No encontrado');
    const alerta = await service.reenviarAlerta(actual.id);
    return ok(res, { data: alerta });
  } catch (e) {
    if (e instanceof AppError) return fail(res, e.status, e.error, e.detail);
    return fail(res, 500, 'Error reenviando alerta', e.message);
  }
}

module.exports = { listar, crearPrueba, reenviar };
