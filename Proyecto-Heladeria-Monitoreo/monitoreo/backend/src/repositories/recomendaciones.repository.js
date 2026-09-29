const { Recomendacion } = require('../models');

async function listarPorOrg(organizacionId) {
  return Recomendacion.findAll({
    where: { organizacion_id: organizacionId },
    order: [['creada_en', 'DESC']], // la tabla usa "creada_en", no "creado_en"
  });
}

async function buscarPorId(id) {
  return Recomendacion.findByPk(id);
}

// Recibe campos ya en snake_case desde el service (el modelo no autonormaliza).
async function crear(datos) {
  return Recomendacion.create(datos);
}

async function actualizar(id, campos) {
  const r = await Recomendacion.findByPk(id);
  if (!r) return null;
  await r.update(campos);
  return r;
}

module.exports = { listarPorOrg, buscarPorId, crear, actualizar };
