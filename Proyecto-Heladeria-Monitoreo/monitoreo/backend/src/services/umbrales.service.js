const repo = require('../repositories/umbrales.repository');
const { AppError } = require('../utils/errors');
const { registrarAuditoria } = require('./auditoria.service');

// Rangos semiabiertos [inf, sup): contiguos no solapan, cruzados sí.
function haySolapeRangos(inf, sup, existentes) {
  return (existentes || []).some((e) => {
    const ei = Number(e.limite_inferior);
    const es = Number(e.limite_superior);
    return inf < es && sup > ei;
  });
}

// Períodos cerrados [inicio, fin] (fechas 'YYYY-MM-DD' comparan como string).
function haySolapePeriodos(inicio, fin, existentes) {
  return (existentes || []).some((e) => inicio <= e.fecha_fin && fin >= e.fecha_inicio);
}

async function crearUmbral(datos, contexto) {
  const existentes = await repo.listarActivos(datos.organizacion_id ?? datos.organizacionId, datos.tipoRecursoId);
  if (haySolapeRangos(Number(datos.limiteInferior), Number(datos.limiteSuperior), existentes)) {
    throw new AppError(400, 'Rango solapado');
  }
  const umbral = await repo.crear({
    organizacion_id: datos.organizacionId,
    tipo_recurso_id: datos.tipoRecursoId,
    nombre: datos.nombre,
    nivel: datos.nivel,
    limite_inferior: datos.limiteInferior,
    limite_superior: datos.limiteSuperior,
    estado: 'activo',
  });
  await registrarAuditoria({
    entidad: 'umbral_clasificacion', entidadId: umbral.id, accion: 'crear',
    usuarioId: contexto.usuarioId, reqId: contexto.reqId,
    detalle: { nivel: datos.nivel, rango: [datos.limiteInferior, datos.limiteSuperior], tipoRecursoId: datos.tipoRecursoId },
  });
  return umbral;
}

async function actualizarUmbral(umbralId, cambios, contexto) {
  const actual = await repo.buscarPorId(umbralId);
  if (!actual) throw new AppError(404, 'Umbral no encontrado');
  const inf = Number(cambios.limiteInferior ?? actual.limite_inferior);
  const sup = Number(cambios.limiteSuperior ?? actual.limite_superior);
  if (inf >= sup) throw new AppError(400, 'Rango inválido', 'limiteInferior debe ser menor que limiteSuperior');
  const existentes = (await repo.listarActivos(actual.organizacion_id, actual.tipo_recurso_id))
    .filter((e) => e.id !== umbralId);
  if (haySolapeRangos(inf, sup, existentes)) throw new AppError(400, 'Rango solapado');
  const mapa = {
    nombre: cambios.nombre, nivel: cambios.nivel, estado: cambios.estado,
    limite_inferior: cambios.limiteInferior, limite_superior: cambios.limiteSuperior,
  };
  const limpio = Object.fromEntries(Object.entries(mapa).filter(([, v]) => v !== undefined));
  await repo.actualizar(umbralId, limpio);
  await registrarAuditoria({
    entidad: 'umbral_clasificacion', entidadId: umbralId, accion: 'actualizar',
    usuarioId: contexto.usuarioId, reqId: contexto.reqId, detalle: limpio,
  });
  return repo.buscarPorId(umbralId);
}

<<<<<<< HEAD
module.exports = { haySolapeRangos, haySolapePeriodos, crearUmbral, actualizarUmbral };
=======
async function eliminarUmbral(umbralId, contexto) {
  const actual = await repo.buscarPorId(umbralId);
  if (!actual) throw new AppError(404, 'Umbral no encontrado');
  await repo.actualizar(umbralId, { estado: 'inactivo' });
  await registrarAuditoria({
    entidad: 'umbral_clasificacion', entidadId: umbralId, accion: 'eliminar',
    usuarioId: contexto.usuarioId, reqId: contexto.reqId,
    detalle: { nombre: actual.nombre, nivel: actual.nivel },
  });
  return repo.buscarPorId(umbralId);
}

module.exports = { haySolapeRangos, haySolapePeriodos, crearUmbral, actualizarUmbral, eliminarUmbral };
>>>>>>> origin/feature/Airton-auxilio
