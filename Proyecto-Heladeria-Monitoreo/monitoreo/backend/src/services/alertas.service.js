const { Alerta } = require('../models');
const { crearSiNoExiste, reenviar } = require('../repositories/entrega.repository');
const { obtenerPorId } = require('../repositories/alertas.repository');
const { registrarAuditoria } = require('./auditoria.service');
const { entregarAlertaPorId } = require('../jobs/alertDeliveryWorker');
const { AppError } = require('../utils/errors');

async function crearAlerta({ organizacionId, registroId, umbralId, nivel, tipoRecurso, cantidad, unidad, nombreUmbral }, transaction) {
  const mensaje = `Consumo de ${tipoRecurso} de ${Number(cantidad)} ${unidad} alcanzó el nivel "${nivel}" (umbral: ${nombreUmbral}).`;
  const alerta = await Alerta.create({
    organizacion_id: organizacionId,
    registro_consumo_id: registroId,
    umbral_id: umbralId,
    nivel,
    tipo_recurso: tipoRecurso,
    mensaje,
    fecha_generacion: new Date(),
    estado: 'pendiente',
  }, { transaction });
  await crearSiNoExiste(alerta.id, transaction); // encola entrega hacia el POS
  await registrarAuditoria({
    entidad: 'alerta', entidadId: alerta.id, accion: 'crear', reqId: null,
    detalle: { nivel, registroId, umbralId },
  }, transaction);
  return alerta;
}

// Alerta manual de demostracion (sin consumo ni umbral asociados: ambos FK
// son nullable). Encola la entrega y, ademas, intenta una entrega inmediata
// best-effort; si falla, la cola reintenta de forma durable.
async function crearAlertaManual({ organizacionId, nivel, tipoRecurso, mensaje }) {
  const texto = mensaje && mensaje.trim().length
    ? mensaje.trim()
    : `Alerta manual de prueba (${tipoRecurso}, nivel ${nivel}).`;
  const alerta = await Alerta.create({
    organizacion_id: organizacionId,
    registro_consumo_id: null,
    umbral_id: null,
    nivel,
    tipo_recurso: tipoRecurso,
    mensaje: texto,
    fecha_generacion: new Date(),
    estado: 'pendiente',
  });
  await crearSiNoExiste(alerta.id);
  await registrarAuditoria({
    entidad: 'alerta', entidadId: alerta.id, accion: 'crear',
    detalle: { origen: 'manual', nivel, tipoRecurso },
  });
  entregarAlertaPorId(alerta.id).catch(() => {});
  return alerta;
}

// Reenvio manual: resetea la entrega y reintenta inmediatamente. La
// pertenencia a la organizacion la valida el controller (req.orgIds).
async function reenviarAlerta(alertaId) {
  const alerta = await obtenerPorId(alertaId);
  if (!alerta) throw new AppError(404, 'Alerta no encontrada');
  await reenviar(alertaId);
  await Alerta.update({ estado: 'pendiente' }, { where: { id: alertaId } });
  await registrarAuditoria({ entidad: 'alerta', entidadId: alertaId, accion: 'reenviar', detalle: {} });
  entregarAlertaPorId(alertaId).catch(() => {});
  return alerta;
}

async function listarAlertas(organizacionId, filtros) {
  const repo = require('../repositories/alertas.repository');
  return repo.listar(organizacionId, filtros);
}

module.exports = { crearAlerta, listarAlertas, crearAlertaManual, reenviarAlerta };
