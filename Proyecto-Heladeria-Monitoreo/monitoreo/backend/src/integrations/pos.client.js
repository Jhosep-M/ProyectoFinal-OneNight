const { env } = require('../config/environment');

// POST de alerta hacia el POS (contrato AGENTS.md §7).
// Timeout duro con AbortController: si el POS no responde en
// DELIVERY_TIMEOUT_MS (config/environment.js:16-18, default 5000ms,
// DELIVERY_BACKOFF_MINUTES y DELIVERY_MAX_INTENTOS acompañan), lanzamos
// y el worker agenda reintento.
async function enviarAlertaPOS(alerta) {
  if (!env.posAlertsUrl) throw new Error('POS_ALERTS_URL no configurado');
  // Paridad con pos/posBackend/src/integrations/monitoreoClient.js:15-17:
  // en producción solo https (evita filtrar alertas por red insegura).
  let protocolo;
  try {
    protocolo = new URL(env.posAlertsUrl).protocol;
  } catch {
    throw new Error('POS_ALERTS_URL inválida');
  }
  if (env.nodeEnv === 'production' && protocolo !== 'https:') {
    throw new Error('POS_ALERTS_URL debe ser https en produccion');
  }
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
