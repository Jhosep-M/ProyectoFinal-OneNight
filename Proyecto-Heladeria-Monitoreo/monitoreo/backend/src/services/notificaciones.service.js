const { Notificacion, UsuarioOrganizacion } = require('../models');
const { registrarAuditoria } = require('./auditoria.service');

// Broadcast: 1 notificación general (usuario_id NULL) + 1 por miembro activo de la org.
async function notificarAlerta(alerta, transaction) {
  const creadas = [];
  creadas.push(await Notificacion.create(
    { alerta_id: alerta.id, usuario_id: null, canal: 'in_app', estado: 'pendiente' },
    { transaction },
  ));
  const miembros = await UsuarioOrganizacion.findAll({
    where: { organizacion_id: alerta.organizacion_id, estado: 'activo' },
    attributes: ['usuario_id'],
    transaction,
  });
  for (const m of miembros) {
    creadas.push(await Notificacion.create(
      { alerta_id: alerta.id, usuario_id: m.usuario_id, canal: 'in_app', estado: 'pendiente' },
      { transaction },
    ));
  }
  await registrarAuditoria({
    entidad: 'notificacion', entidadId: null, accion: 'crear_lote',
    detalle: { alertaId: alerta.id, total: creadas.length },
  }, transaction);
  return creadas;
}

module.exports = { notificarAlerta };
