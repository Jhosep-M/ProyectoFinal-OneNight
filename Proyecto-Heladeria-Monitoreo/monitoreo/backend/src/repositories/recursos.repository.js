const { TipoRecurso } = require('../models');

async function listarTodos() {
  return TipoRecurso.findAll({ order: [['codigo', 'ASC']] });
}

async function crear(datos) {
  // Mapeo camelCase (validator) → snake_case (atributo `unidad_base`): Sequelize
  // ignora claves que no coincidan con los atributos del modelo.
  return TipoRecurso.create({ codigo: datos.codigo, nombre: datos.nombre, unidad_base: datos.unidadBase });
}

module.exports = { listarTodos, crear };
