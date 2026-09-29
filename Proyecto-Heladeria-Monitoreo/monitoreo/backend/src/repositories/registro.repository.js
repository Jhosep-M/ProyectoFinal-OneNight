const { RegistroConsumo, TipoRecurso, UmbralClasificacion } = require('../models');

async function tipoRecursoPorCodigo(codigo, transaction) {
  // findOne recibe las opciones en el PRIMER argumento: la transacción va
  // dentro de ese objeto (pasarla como segundo argumento se ignora en silencio).
  return TipoRecurso.findOne({ where: { codigo }, ...(transaction ? { transaction } : {}) });
}

async function umbralesActivos(organizacionId, tipoRecursoId, transaction) {
  return UmbralClasificacion.findAll({
    where: { organizacion_id: organizacionId, tipo_recurso_id: tipoRecursoId, estado: 'activo' },
    order: [['limite_inferior', 'ASC']],
    ...(transaction ? { transaction } : {}),
  });
}

async function crearRegistro(datos, transaction) {
  return RegistroConsumo.create(datos, { transaction });
}

async function marcarClasificado(registroId, clasificacion, transaction) {
  await RegistroConsumo.update({ clasificacion }, { where: { id: registroId }, transaction });
}

module.exports = { tipoRecursoPorCodigo, umbralesActivos, crearRegistro, marcarClasificado };
