const repo = require('../repositories/recursos.repository');
const { ok, okList, fail } = require('../utils/response');
const { registrarAuditoria } = require('../services/auditoria.service');

async function listar(req, res) {
  try {
    const data = await repo.listarTodos();
    return okList(res, data);
  } catch (e) {
    return fail(res, 500, 'Error listando recursos', e.message);
  }
}

async function crear(req, res) {
  try {
    const recurso = await repo.crear(req.body);
    await registrarAuditoria({ entidad: 'tipo_recurso', entidadId: recurso.id, accion: 'crear', usuarioId: req.user.id, reqId: req.id, detalle: req.body });
    return ok(res, recurso, 201);
  } catch (e) {
    if (e.name === 'SequelizeUniqueConstraintError') return fail(res, 409, 'Código de recurso duplicado');
    return fail(res, 500, 'Error creando recurso', e.message);
  }
}

module.exports = { listar, crear };
