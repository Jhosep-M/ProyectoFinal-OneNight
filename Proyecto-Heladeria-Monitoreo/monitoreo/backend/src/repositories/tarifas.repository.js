const { Tarifa } = require('../models');
const { Op } = require('sequelize');

async function listarPorOrg(organizacionId) {
  return Tarifa.findAll({
    where: { organizacion_id: organizacionId },
    order: [['fecha_inicio', 'DESC']],
  });
}

async function buscarPorId(id) {
  return Tarifa.findByPk(id);
}

// Recibe campos ya en snake_case desde el service (el modelo no autonormaliza).
async function crear(datos) {
  return Tarifa.create(datos);
}

async function actualizar(id, campos) {
  const t = await Tarifa.findByPk(id);
  if (!t) return null;
  await t.update(campos);
  return t;
}

// Vecinas con vigencia que puede solapar: misma org o global (NULL), mismo
// recurso. El filtro fecha_inicio <= :fechaFin AND fecha_fin >= :fechaInicio
// es exactamente el solape de intervalos cerrados [inicio, fin].
async function listarVigenciaSimilar({ organizacionId, tipoRecursoId, fechaInicio, fechaFin, excluirId = null }) {
  return Tarifa.findAll({
    where: {
      tipo_recurso_id: tipoRecursoId,
      ...(excluirId ? { id: { [Op.ne]: excluirId } } : {}),
      [Op.or]: [
        { organizacion_id: organizacionId },
        { organizacion_id: null },
      ],
      fecha_inicio: { [Op.lte]: fechaFin },
      fecha_fin: { [Op.gte]: fechaInicio },
    },
  });
}

module.exports = { listarPorOrg, buscarPorId, crear, actualizar, listarVigenciaSimilar };
