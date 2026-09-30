const repo = require('../repositories/auditoria.repository');
const { okList, fail } = require('../utils/response');

// GET /api/v1/reportes/auditoria?organizacionId=&desde=&hasta=&page=&limit=
// Solo lectura; la membresía ya la validan requirePermission + scopeOrg.
async function listar(req, res) {
  try {
    const r = await repo.listar(req.organizacionId, req.query);
    return okList(res, r.data, { total: r.total, page: r.page, limit: r.limit });
  } catch (e) {
    return fail(res, 500, 'Error listando auditoría', e.message);
  }
}

module.exports = { listar };
