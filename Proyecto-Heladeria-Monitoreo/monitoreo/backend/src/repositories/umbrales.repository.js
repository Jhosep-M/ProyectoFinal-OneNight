const { UmbralClasificacion } = require('../models');

async function listarActivos(organizacionId, tipoRecursoId) {
  return UmbralClasificacion.findAll({
    where: { organizacion_id: organizacionId, tipo_recurso_id: tipoRecursoId, estado: 'activo' },
    order: [['limite_inferior', 'ASC']],
  });
}

async function listarPorOrg(organizacionId) {
  return UmbralClasificacion.findAll({
    where: { organizacion_id: organizacionId },
    order: [['creado_en', 'DESC']],
  });
}

async function listarActivosPorOrg(organizacionId) {
  return UmbralClasificacion.findAll({
    where: { organizacion_id: organizacionId, estado: 'activo' },
    order: [['creado_en', 'DESC']],
  });
}

async function buscarPorId(id) {
  return UmbralClasificacion.findByPk(id);
}

async function crear(datos) {
  return UmbralClasificacion.create(datos);
}

async function actualizar(id, campos) {
  const u = await UmbralClasificacion.findByPk(id);
  if (!u) return null;
  await u.update(campos);
  return u;
}

module.exports = { listarActivos, listarPorOrg, listarActivosPorOrg, buscarPorId, crear, actualizar };
