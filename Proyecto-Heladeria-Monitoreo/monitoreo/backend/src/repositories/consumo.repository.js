const { RegistroConsumo, TipoRecurso } = require('../models');
const { Op } = require('sequelize');

async function listar(organizacionId, { desde, hasta, page, limit, recurso, medidorId }) {
  const where = { organizacion_id: organizacionId };
  if (recurso === 'agua' || recurso === 'energia') {
    where.tipo_recurso = recurso;
  }
  if (medidorId) {
    where.punto_medicion_id = medidorId;
  }
  if (desde || hasta) {
    where.fecha_consumo = {
      ...(desde ? { [Op.gte]: new Date(`${desde}T00:00:00`) } : {}),
      ...(hasta ? { [Op.lte]: new Date(`${hasta}T23:59:59.999`) } : {}),
    };
  }
  const { rows, count } = await RegistroConsumo.findAndCountAll({
    where,
    include: [{ model: TipoRecurso, as: 'tipoRecurso' }],
    order: [['fecha_consumo', 'DESC']],
    limit,
    offset: (page - 1) * limit,
  });
  return { data: rows, total: count, page, limit };
}

module.exports = { listar };
