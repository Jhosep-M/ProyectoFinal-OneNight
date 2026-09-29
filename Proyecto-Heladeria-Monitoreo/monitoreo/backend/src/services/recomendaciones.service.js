const repo = require('../repositories/recomendaciones.repository');
const { AppError } = require('../utils/errors');
const { registrarAuditoria } = require('./auditoria.service');

// Sin lógica de solape: los enums (prioridad/estado) ya los controla Zod.
async function crearRecomendacion(datos, contexto) {
  const rec = await repo.crear({
    organizacion_id: datos.organizacionId,
    titulo: datos.titulo,
    descripcion: datos.descripcion,
    prioridad: datos.prioridad, // Zod aplica el default 'media' antes de llegar aquí
    estado: 'abierta',
  });
  await registrarAuditoria({
    entidad: 'recomendacion', entidadId: rec.id, accion: 'crear',
    usuarioId: contexto.usuarioId, reqId: contexto.reqId,
    detalle: { titulo: datos.titulo, prioridad: datos.prioridad },
  });
  return rec;
}

async function actualizarRecomendacion(id, cambios, contexto) {
  const actual = await repo.buscarPorId(id);
  if (!actual) throw new AppError(404, 'Recomendación no encontrada');
  const mapa = {
    titulo: cambios.titulo, descripcion: cambios.descripcion,
    prioridad: cambios.prioridad, estado: cambios.estado,
  };
  const limpio = Object.fromEntries(Object.entries(mapa).filter(([, v]) => v !== undefined));
  await repo.actualizar(id, limpio);
  await registrarAuditoria({
    entidad: 'recomendacion', entidadId: id, accion: 'actualizar',
    usuarioId: contexto.usuarioId, reqId: contexto.reqId, detalle: limpio,
  });
  return repo.buscarPorId(id);
}

module.exports = { crearRecomendacion, actualizarRecomendacion };
