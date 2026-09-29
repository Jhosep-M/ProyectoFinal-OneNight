const repo = require('../repositories/usuarios.repository');
const { okList, fail } = require('../utils/response');

async function listar(req, res) {
  try {
    const data = await repo.listarUsuariosDeOrg(req.organizacionId);
    return okList(res, data);
  } catch (e) {
    return fail(res, 500, 'Error listando usuarios', e.message);
  }
}

module.exports = { listar };
