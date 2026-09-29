const service = require('../services/alertas.service');
const { okList, fail } = require('../utils/response');

async function listar(req, res) {
  try {
    const data = await service.listarAlertas(req.organizacionId, req.query);
    return okList(res, data);
  } catch (e) {
    return fail(res, 500, 'Error listando alertas', e.message);
  }
}

module.exports = { listar };
