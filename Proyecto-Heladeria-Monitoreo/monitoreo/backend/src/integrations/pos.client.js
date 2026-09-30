const { env } = require('../config/environment');

// POST de alerta hacia el POS (contrato AGENTS.md §7).
// Timeout duro con AbortController: si el POS no responde en
// DELIVERY_TIMEOUT_MS, lanzamos y el worker agenda reintento.
async function enviarAlertaPOS(alerta) {
  if (!env.posAlertsUrl) throw new Error('POS_ALERTS_URL no configurado');
  const controlador = new AbortController();
  const reloj = setTimeout(() => controlador.abort(), env.deliveryTimeoutMs);
  try {
    // Contrato alerts.v1: el receptor POS autentica por header `x-api-key`
    // (pos/posBackend/src/routes/integrations.js) y exige nivel del enum
    // (info|advertencia|critico). Mapeamos el nivel interno ('alerta'->'advertencia').
    const nivelContrato = alerta.nivel === 'alerta' ? 'advertencia' : alerta.nivel;
    const respuesta = await fetch(env.posAlertsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.posAlertsApiKey,
      },
      body: JSON.stringify({
        alertaId: alerta.id,
        nivel: nivelContrato,
        tipoRecurso: alerta.tipo_recurso,
        mensaje: alerta.mensaje,
        fechaGeneracion: new Date(alerta.fecha_generacion).toISOString(),
      }),
      signal: controlador.signal,
    });
    return { ok: respuesta.ok, status: respuesta.status };
  } finally {
    clearTimeout(reloj);
  }
}

module.exports = { enviarAlertaPOS };
