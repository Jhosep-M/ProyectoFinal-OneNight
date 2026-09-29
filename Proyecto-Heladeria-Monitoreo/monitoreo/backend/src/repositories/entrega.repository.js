const { EntregaAlerta } = require('../models');

// UNIQUE(alerta_id): reintentar la creación nunca duplica entregas.
async function crearSiNoExiste(alertaId, transaction) {
  const [fila] = await EntregaAlerta.findOrCreate({
    where: { alerta_id: alertaId },
    defaults: { estado: 'pendiente', intentos: 0, proximo_intento: null },
    ...(transaction ? { transaction } : {}),
  });
  return fila;
}

module.exports = { crearSiNoExiste };
