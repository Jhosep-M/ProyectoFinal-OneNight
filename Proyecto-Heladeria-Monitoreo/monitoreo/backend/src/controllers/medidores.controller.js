const repo = require('../repositories/medidores.repository');
const { ok, okList, fail } = require('../utils/response');
const { registrarAuditoria } = require('../services/auditoria.service');

// Regla del brief: IDs de :id validados como UUID → 404 sin filtrar existencia.
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
    return fail(res, 500, 'Error listando medidores', e.message);
  }
}

async function crear(req, res) {
  try {
    if (!req.orgIds.includes(req.body.organizacionId)) {
      return fail(res, 403, 'Forbidden', 'organización fuera de tu membresía');
    }
    if (await repo.existeCodigo(req.body.codigoMedidor)) {
      return fail(res, 409, 'Código de medidor duplicado');
    }
    const medidor = await repo.crear(req.body);
    await registrarAuditoria({ entidad: 'punto_medicion', entidadId: medidor.id, accion: 'crear', usuarioId: req.user.id, reqId: req.id, detalle: req.body });
    return ok(res, medidor, 201);
  } catch (e) {
    if (e.name === 'SequelizeUniqueConstraintError') return fail(res, 409, 'Código de medidor duplicado');
    return fail(res, 500, 'Error creando medidor', e.message);
  }
}

async function actualizar(req, res) {
  try {
    const medidor = ES_UUID.test(req.params.id) ? await repo.buscarPorId(req.params.id) : null;
    if (!medidor || !req.orgIds.includes(medidor.organizacion_id)) return fail(res, 404, 'No encontrada');
<<<<<<< HEAD
    await repo.actualizar(medidor.id, req.body);
    await registrarAuditoria({ entidad: 'punto_medicion', entidadId: medidor.id, accion: 'actualizar', usuarioId: req.user.id, reqId: req.id, detalle: req.body });
    return ok(res, medidor);
  } catch (e) {
=======
    const campos = { ...req.body };
    if (campos.codigoMedidor !== undefined) {
      if (campos.codigoMedidor !== medidor.codigo_medidor && await repo.existeCodigo(campos.codigoMedidor)) {
        return fail(res, 409, 'Código de medidor duplicado');
      }
      campos.codigo_medidor = campos.codigoMedidor;
      delete campos.codigoMedidor;
    }
    await repo.actualizar(medidor.id, campos);
    await registrarAuditoria({ entidad: 'punto_medicion', entidadId: medidor.id, accion: 'actualizar', usuarioId: req.user.id, reqId: req.id, detalle: campos });
    return ok(res, medidor);
  } catch (e) {
    if (e.name === 'SequelizeUniqueConstraintError') return fail(res, 409, 'Código de medidor duplicado');
>>>>>>> origin/feature/Airton-auxilio
    return fail(res, 500, 'Error actualizando medidor', e.message);
  }
}

<<<<<<< HEAD
module.exports = { listar, crear, actualizar };
=======
async function eliminar(req, res) {
  try {
    const medidor = ES_UUID.test(req.params.id) ? await repo.buscarPorId(req.params.id) : null;
    if (!medidor || !req.orgIds.includes(medidor.organizacion_id)) return fail(res, 404, 'No encontrada');
    await repo.actualizar(medidor.id, { estado: 'inactivo' });
    await registrarAuditoria({ entidad: 'punto_medicion', entidadId: medidor.id, accion: 'eliminar', usuarioId: req.user.id, reqId: req.id, detalle: { codigo: medidor.codigo_medidor } });
    return ok(res, medidor);
  } catch (e) {
    return fail(res, 500, 'Error eliminando medidor', e.message);
  }
}

module.exports = { listar, crear, actualizar, eliminar };
>>>>>>> origin/feature/Airton-auxilio
