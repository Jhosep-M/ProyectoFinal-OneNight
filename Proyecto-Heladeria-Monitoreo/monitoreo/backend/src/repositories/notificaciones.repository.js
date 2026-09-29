const { Notificacion, Alerta } = require('../models');
const { Op } = require('sequelize');

// Las suyas (usuario_id = user) + broadcast (NULL) de alertas de sus orgs.
async function listarParaUsuario(usuarioId, orgIds) {
  return Notificacion.findAll({
    include: [{
      model: Alerta, as: 'alerta',
      where: { organizacion_id: { [Op.in]: orgIds } },
    }],
    where: {
      [Op.or]: [
        { usuario_id: usuarioId },
        { usuario_id: null },
      ],
    },
    order: [['creada_en', 'DESC']],
    limit: 200,
  });
}

async function buscarPorId(id) {
  return Notificacion.findByPk(id, { include: [{ model: Alerta, as: 'alerta' }] });
}

async function marcarVista(id) {
  const n = await Notificacion.findByPk(id);
  if (!n) return null;
  await n.update({ estado: 'vista', vista_en: new Date() });
  return n;
}

module.exports = { listarParaUsuario, buscarPorId, marcarVista };
