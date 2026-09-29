const { PuntoMedicion, TipoRecurso } = require('../models');
const { Op } = require('sequelize');

async function listarPorOrg(organizacionId) {
  return PuntoMedicion.findAll({
    where: { organizacion_id: organizacionId },
    include: [{ model: TipoRecurso, as: 'tipoRecurso' }],
    order: [['codigo_medidor', 'ASC']],
  });
}

<<<<<<< HEAD
=======
async function listarActivosPorOrg(organizacionId) {
  return PuntoMedicion.findAll({
    where: { organizacion_id: organizacionId, estado: 'activo' },
    include: [{ model: TipoRecurso, as: 'tipoRecurso' }],
    order: [['codigo_medidor', 'ASC']],
  });
}

>>>>>>> origin/feature/Airton-auxilio
async function buscarPorId(id) {
  return PuntoMedicion.findByPk(id, { include: [{ model: TipoRecurso, as: 'tipoRecurso' }] });
}

async function existeCodigo(codigoMedidor) {
  return !!(await PuntoMedicion.findOne({ where: { codigo_medidor: codigoMedidor } }));
}

async function crear(datos) {
  // El body llega en camelCase (validator) y los atributos del modelo son
  // snake_case: sin este mapeo, Sequelize descarta las claves y viola NOT NULL.
  return PuntoMedicion.create({
    organizacion_id: datos.organizacionId,
    tipo_recurso_id: datos.tipoRecursoId,
    codigo_medidor: datos.codigoMedidor,
    nombre: datos.nombre,
  });
}

async function actualizar(id, campos) {
  const p = await PuntoMedicion.findByPk(id);
  if (!p) return null;
  await p.update(campos);
  return p;
}

<<<<<<< HEAD
module.exports = { listarPorOrg, buscarPorId, existeCodigo, crear, actualizar };
=======
module.exports = { listarPorOrg, listarActivosPorOrg, buscarPorId, existeCodigo, crear, actualizar };
>>>>>>> origin/feature/Airton-auxilio
