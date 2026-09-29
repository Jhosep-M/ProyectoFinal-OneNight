const service = require('../services/reportes.service');
const { ok, okList, fail } = require('../utils/response');

async function consumo(req, res) {
  try {
    const reporte = await service.reporteConsumo(req.organizacionId, req.query);
    return ok(res, reporte);
  } catch (e) {
    return fail(res, 500, 'Error generando reporte', e.message);
  }
}

async function topExcesos(req, res) {
  try {
    const data = await service.topExcesos(req.organizacionId, req.query);
    return okList(res, data);
  } catch (e) {
    return fail(res, 500, 'Error listando excesos', e.message);
  }
}

module.exports = { consumo, topExcesos };
