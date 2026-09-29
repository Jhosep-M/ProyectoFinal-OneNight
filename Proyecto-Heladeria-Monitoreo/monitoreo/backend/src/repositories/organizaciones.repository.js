const { Organizacion, Rol } = require('../models');
const { Op } = require('sequelize');

async function listarPorIds(ids) {
  return Organizacion.findAll({ where: { id: { [Op.in]: ids }, estado: 'activo' }, order: [['nombre', 'ASC']] });
}

async function buscarPorId(id) {
  return Organizacion.findByPk(id);
}

async function crear({ nombre, nit }) {
  return Organizacion.create({ nombre, nit: nit ?? null });
}

async function actualizar(id, campos) {
  const org = await Organizacion.findByPk(id);
  if (!org) return null;
  await org.update(campos);
  return org;
}

module.exports = { listarPorIds, buscarPorId, crear, actualizar };
