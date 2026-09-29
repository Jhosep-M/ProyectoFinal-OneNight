const { getPerfil } = require('../services/auth.service');
const { ok, fail } = require('../utils/response');

async function me(req, res) {
  try {
    const perfil = await getPerfil(req.user.id, req.user.email, req.user.nombre ?? null);
    return ok(res, perfil);
  } catch (e) {
    return fail(res, 500, 'Error obteniendo perfil', e.message);
  }
}

module.exports = { me };
