const { RecepcionConsumoPOS, ColaProcesamiento } = require('../models');
const { Op } = require('sequelize');

async function buscarDuplicado(idempotencyKey, consumoExternoId) {
  return RecepcionConsumoPOS.findOne({
    where: { [Op.or]: [{ idempotency_key: idempotencyKey }, { consumo_externo_id: consumoExternoId }] },
  });
}

async function crearConCola(datos, transaction) {
  const recepcion = await RecepcionConsumoPOS.create(datos, { transaction });
  await ColaProcesamiento.create({ recepcion_id: recepcion.id, estado: 'pendiente', intentos: 0 }, { transaction });
  return recepcion;
}

module.exports = { buscarDuplicado, crearConCola };
