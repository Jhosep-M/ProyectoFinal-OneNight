const service = require('../services/consumo.service');
const { okList, fail } = require('../utils/response');

async function listar(req, res) {
  try {
    const r = await service.listarConsumo(req.organizacionId, req.query);
    return okList(res, r.data, { total: r.total, page: r.page, limit: r.limit });
  } catch (e) {
    return fail(res, 500, 'Error listando consumo', e.message);
  }
}

module.exports = { listar };
