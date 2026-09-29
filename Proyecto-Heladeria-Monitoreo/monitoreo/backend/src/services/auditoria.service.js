const { AuditoriaCambio } = require('../models');

async function registrarAuditoria({ entidad, entidadId = null, accion, usuarioId = null, reqId = null, detalle = null }, transaction = null) {
  await AuditoriaCambio.create(
    { entidad, entidad_id: entidadId, accion, usuario_id: usuarioId, req_id: reqId, detalle },
    transaction ? { transaction } : undefined,
  );
}

module.exports = { registrarAuditoria };
