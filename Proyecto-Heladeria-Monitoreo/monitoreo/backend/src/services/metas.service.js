const repo = require('../repositories/metas.repository');
const { AppError } = require('../utils/errors');
const { registrarAuditoria } = require('./auditoria.service');

async function crearMeta(datos, contexto) {
  if (datos.fechaInicio >= datos.fechaFin) throw new AppError(400, 'Fechas inválidas', 'fechaInicio debe ser anterior a fechaFin');
  if (datos.porcentajeReduccion < 0 || datos.porcentajeReduccion > 100) throw new AppError(400, 'Porcentaje inválido');
  const meta = await repo.crear({
    organizacion_id: datos.organizacionId,
    tipo_recurso_id: datos.tipoRecursoId,
    nombre: datos.nombre,
    porcentaje_reduccion: datos.porcentajeReduccion,
    fecha_inicio: datos.fechaInicio,
    fecha_fin: datos.fechaFin,
    estado: 'activo',
  });
  await registrarAuditoria({
    entidad: 'meta_reduccion', entidadId: meta.id, accion: 'crear',
    usuarioId: contexto.usuarioId, reqId: contexto.reqId,
    detalle: { porcentaje: datos.porcentajeReduccion, periodo: [datos.fechaInicio, datos.fechaFin] },
  });
  return meta;
}

async function actualizarMeta(id, cambios, contexto) {
  const actual = await repo.buscarPorId(id);
  if (!actual) throw new AppError(404, 'Meta no encontrada');
  const inicio = cambios.fechaInicio ?? actual.fecha_inicio;
  const fin = cambios.fechaFin ?? actual.fecha_fin;
  if (String(inicio) >= String(fin)) throw new AppError(400, 'Fechas inválidas');
  const mapa = {
    nombre: cambios.nombre, porcentaje_reduccion: cambios.porcentajeReduccion,
    fecha_inicio: cambios.fechaInicio, fecha_fin: cambios.fechaFin, estado: cambios.estado,
  };
  const limpio = Object.fromEntries(Object.entries(mapa).filter(([, v]) => v !== undefined));
  await repo.actualizar(id, limpio);
  await registrarAuditoria({
    entidad: 'meta_reduccion', entidadId: id, accion: 'actualizar',
    usuarioId: contexto.usuarioId, reqId: contexto.reqId, detalle: limpio,
  });
  return repo.buscarPorId(id);
}

module.exports = { crearMeta, actualizarMeta };
