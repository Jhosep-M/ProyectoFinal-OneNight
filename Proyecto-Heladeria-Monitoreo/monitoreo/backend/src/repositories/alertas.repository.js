const { Alerta } = require('../models');
const { Op } = require('sequelize');

async function listar(organizacionId, { desde, hasta, nivel }) {
  const where = { organizacion_id: organizacionId };
  if (nivel) where.nivel = nivel;
  if (desde || hasta) {
    where.fecha_generacion = {
      ...(desde ? { [Op.gte]: new Date(`${desde}T00:00:00`) } : {}),
      ...(hasta ? { [Op.lte]: new Date(`${hasta}T23:59:59.999`) } : {}),
    };
  }
  return Alerta.findAll({ where, order: [['fecha_generacion', 'DESC']], limit: 200 });
}

module.exports = { listar };
