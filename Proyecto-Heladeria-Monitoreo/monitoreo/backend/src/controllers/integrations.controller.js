const { recibirConsumo } = require('../services/integracion.service');
const { ok, fail } = require('../utils/response');

async function recepcionConsumo(req, res) {
  try {
    const { status, body } = await recibirConsumo(req.body, req.integracion, req.id);
    return ok(res, body, status); // 201 nueva | 200 duplicado
  } catch (e) {
    if (e.status) return fail(res, e.status, e.error, e.detail);
    if (e.name === 'SequelizeValidationError') {
      return fail(res, 400, 'Payload inválido', e.errors?.map((x) => ({ path: x.path, message: x.message })));
    }
    return fail(res, 500, 'Error registrando consumo', e.message); // sin stack traces
  }
}

module.exports = { recepcionConsumo };
