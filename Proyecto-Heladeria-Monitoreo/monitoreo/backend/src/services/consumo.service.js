const repo = require('../repositories/consumo.repository');

async function listarConsumo(organizacionId, filtros) {
  return repo.listar(organizacionId, filtros);
}

module.exports = { listarConsumo };
