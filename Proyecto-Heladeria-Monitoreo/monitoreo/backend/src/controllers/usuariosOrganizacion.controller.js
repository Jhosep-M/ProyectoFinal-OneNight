const repo = require('../repositories/usuarioOrganizacion.repository');
const { ok, fail } = require('../utils/response');
const { registrarAuditoria } = require('../services/auditoria.service');

// Regla del brief: IDs de :id validados como UUID → 404 sin filtrar existencia.
const ES_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function crear(req, res) {
  try {
    if (!req.orgIds.includes(req.body.organizacionId)) {
      return fail(res, 403, 'Forbidden', 'organización fuera de tu membresía');
    }
    const membresia = await repo.asignar(req.body);
    await registrarAuditoria({ entidad: 'usuario_organizacion', entidadId: membresia.id, accion: 'asignar_membresia', usuarioId: req.user.id, reqId: req.id, detalle: req.body });
    return ok(res, membresia, 201);
  } catch (e) {
    return fail(res, 500, 'Error asignando membresía', e.message);
  }
}

async function actualizar(req, res) {
  try {
    const membresia = ES_UUID.test(req.params.id) ? await repo.buscarPorId(req.params.id) : null;
    if (!membresia || !req.orgIds.includes(membresia.organizacion_id)) return fail(res, 404, 'No encontrada');
    await repo.actualizar(membresia.id, req.body);
    await registrarAuditoria({ entidad: 'usuario_organizacion', entidadId: membresia.id, accion: 'actualizar_membresia', usuarioId: req.user.id, reqId: req.id, detalle: req.body });
    return ok(res, membresia);
  } catch (e) {
    return fail(res, 500, 'Error actualizando membresía', e.message);
  }
}

module.exports = { crear, actualizar };
