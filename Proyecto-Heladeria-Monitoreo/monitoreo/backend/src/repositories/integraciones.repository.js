const { Integracion } = require('../models');

async function listarPorOrg(organizacionId) {
  // Excluir api_key_hash de la proyección: jamás sale del backend.
  return Integracion.findAll({
    where: { organizacion_id: organizacionId },
    attributes: { exclude: ['api_key_hash'] },
    order: [['creado_en', 'DESC']],
  });
}

async function buscarPorId(id) {
  return Integracion.findByPk(id, { attributes: { exclude: ['api_key_hash'] } });
}

async function crear({ organizacionId, nombre, api_key_hash }) {
  return Integracion.create({ organizacion_id: organizacionId, nombre, api_key_hash, estado: 'activo' });
}

async function guardarHash(id, api_key_hash) {
  await Integracion.update({ api_key_hash }, { where: { id } });
}

async function actualizar(id, campos) {
  const i = await Integracion.findByPk(id);
  if (!i) return null;
  await i.update(campos);
  return i;
}

module.exports = { listarPorOrg, buscarPorId, crear, guardarHash, actualizar };
