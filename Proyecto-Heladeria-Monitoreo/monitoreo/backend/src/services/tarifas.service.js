const repo = require('../repositories/tarifas.repository');
const { haySolapePeriodos } = require('./umbrales.service');
const { AppError } = require('../utils/errors');
const { registrarAuditoria } = require('./auditoria.service');

async function crearTarifa(datos, contexto) {
  const vecinas = await repo.listarVigenciaSimilar({
    organizacionId: datos.organizacionId ?? null,
    tipoRecursoId: datos.tipoRecursoId,
    fechaInicio: datos.fechaInicio,
    fechaFin: datos.fechaFin,
  });
  if (haySolapePeriodos(datos.fechaInicio, datos.fechaFin, vecinas)) {
    throw new AppError(400, 'Período solapado');
  }
  const tarifa = await repo.crear({
    organizacion_id: datos.organizacionId ?? null,
    tipo_recurso_id: datos.tipoRecursoId,
    nombre: datos.nombre,
    monto: datos.monto,
    unidad: datos.unidad,
    fecha_inicio: datos.fechaInicio,
    fecha_fin: datos.fechaFin,
  });
  await registrarAuditoria({
    entidad: 'tarifa', entidadId: tarifa.id, accion: 'crear',
    usuarioId: contexto.usuarioId, reqId: contexto.reqId,
    detalle: { monto: datos.monto, periodo: [datos.fechaInicio, datos.fechaFin] },
  });
  return tarifa;
}

async function actualizarTarifa(id, cambios, contexto) {
  const actual = await repo.buscarPorId(id);
  if (!actual) throw new AppError(404, 'Tarifa no encontrada');
  const inicio = String(cambios.fechaInicio ?? actual.fecha_inicio);
  const fin = String(cambios.fechaFin ?? actual.fecha_fin);
  if (inicio > fin) throw new AppError(400, 'Fechas inválidas', 'fechaInicio debe ser <= fechaFin');
  // Re-valida el solape del período resultante (excluyendo la propia tarifa):
  // el chequeo corre siempre porque el período efectivo cambia solo si tocan
  // fechaInicio/fechaFin, y el existente ya debe ser consistente.
  const vecinas = await repo.listarVigenciaSimilar({
    organizacionId: actual.organizacion_id,
    tipoRecursoId: actual.tipo_recurso_id,
    fechaInicio: inicio,
    fechaFin: fin,
    excluirId: id,
  });
  if (haySolapePeriodos(inicio, fin, vecinas)) throw new AppError(400, 'Período solapado');
  const mapa = {
    nombre: cambios.nombre, monto: cambios.monto,
    fecha_inicio: cambios.fechaInicio, fecha_fin: cambios.fechaFin,
  };
  const limpio = Object.fromEntries(Object.entries(mapa).filter(([, v]) => v !== undefined));
  await repo.actualizar(id, limpio);
  await registrarAuditoria({
    entidad: 'tarifa', entidadId: id, accion: 'actualizar',
    usuarioId: contexto.usuarioId, reqId: contexto.reqId, detalle: limpio,
  });
  return repo.buscarPorId(id);
}

module.exports = { crearTarifa, actualizarTarifa };
