const { sequelize } = require('../config/database');
const repo = require('../repositories/recepcion.repository');
const { Integracion } = require('../models');
const { registrarAuditoria } = require('./auditoria.service');
const { AppError } = require('../utils/errors');

async function recibirConsumo(payload, integracion, reqId) {
  const orgId = payload.organizacionExternaId ?? integracion.organizacion_id;
  if (String(orgId) !== String(integracion.organizacion_id)) {
    throw new AppError(403, 'organizacionExternaId no coincide con la integración');
  }
  const idempotencyKey = payload.idempotencyKey ?? payload.consumoExternoId;

  try {
    const recepcionId = await sequelize.transaction(async (t) => {
      const recepcion = await repo.crearConCola({
        consumo_externo_id: payload.consumoExternoId,
        idempotency_key: idempotencyKey,
        organizacion_id: integracion.organizacion_id,
        tipo_recurso: payload.tipoRecurso,
        // La BD persiste NUMERIC(14,3): redondeo determinista a 3 decimales.
        cantidad: Number(payload.cantidad.toFixed(3)),
        unidad_medida: payload.unidadMedida,
        fecha_consumo: payload.fechaConsumo,
        origen: payload.origen,
        estado: 'recibido',
      }, t);
      await Integracion.update({ ultimo_uso_en: new Date() }, { where: { id: integracion.id }, transaction: t });
      await registrarAuditoria({
        entidad: 'recepcion_consumo_pos',
        entidadId: recepcion.id,
        accion: 'recibir',
        reqId,
        detalle: { idempotencyKey, consumoExternoId: payload.consumoExternoId, origen: payload.origen },
      }, t);
      return recepcion.id;
    });
    return { status: 201, body: { recepcionId, estado: 'recibido', duplicado: false } };
  } catch (e) {
    if (e.name === 'SequelizeUniqueConstraintError') {
      const existente = await repo.buscarDuplicado(idempotencyKey, payload.consumoExternoId);
      if (existente) {
        return { status: 200, body: { recepcionId: existente.id, estado: existente.estado, duplicado: true } };
      }
    }
    throw e;
  }
}

module.exports = { recibirConsumo };
