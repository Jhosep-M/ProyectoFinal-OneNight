const { RecepcionConsumoPOS, ColaProcesamiento } = require('../models');
const { Op } = require('sequelize');

async function buscarDuplicado(idempotencyKey, consumoExternoId) {
  const conds = [{ consumo_externo_id: consumoExternoId }];
  if (idempotencyKey) conds.push({ idempotency_key: idempotencyKey });
  return RecepcionConsumoPOS.findOne({ where: { [Op.or]: conds } });
}

async function crearConCola(datos, transaction) {
  const recepcion = await RecepcionConsumoPOS.create(datos, { transaction });
  await ColaProcesamiento.create({ recepcion_id: recepcion.id, estado: 'pendiente', intentos: 0 }, { transaction });
  return recepcion;
}

module.exports = { buscarDuplicado, crearConCola };
