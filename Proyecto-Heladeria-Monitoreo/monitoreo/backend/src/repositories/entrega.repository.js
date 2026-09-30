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

// Reenvio manual: devuelve la entrega a 'pendiente' y limpia el backoff
// para que el worker (o la entrega inmediata) la tome de nuevo.
async function reenviar(alertaId) {
  return EntregaAlerta.update(
    { estado: 'pendiente', intentos: 0, proximo_intento: new Date(), ultimo_error: null },
    { where: { alerta_id: alertaId } },
  );
}

module.exports = { crearSiNoExiste, reenviar };
