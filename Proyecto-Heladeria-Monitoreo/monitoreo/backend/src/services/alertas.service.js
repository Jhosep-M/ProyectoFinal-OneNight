const { Alerta } = require('../models');
const { crearSiNoExiste } = require('../repositories/entrega.repository');
const { registrarAuditoria } = require('./auditoria.service');

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

async function listarAlertas(organizacionId, filtros) {
  const repo = require('../repositories/alertas.repository');
  return repo.listar(organizacionId, filtros);
}

module.exports = { crearAlerta, listarAlertas };
