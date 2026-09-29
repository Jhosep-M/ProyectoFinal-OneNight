async function enviarConsumoAMonitoreo(payload, apiKey, url, timeoutMs = 5000) {
  if (!url || typeof url !== 'string' || !url.trim()) {
    throw new Error('monitoreo url requerido');
  }
  if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
    throw new Error('monitoreo apiKey requerido');
  }
  const ms = Number(timeoutMs) > 0 ? Number(timeoutMs) : 5000;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('monitoreo url invalida');
  }
  if (process.env.NODE_ENV === 'production') {
    if (parsed.protocol !== 'https:') {
      throw new Error('monitoreo url debe ser https en produccion');
    }
  } else if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('monitoreo url debe ser http(s)');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, body: text };
  } catch (e) {
    if (e.name === 'AbortError') {
      throw new Error('timeout al contactar monitoreo');
    }
    throw new Error('error al contactar monitoreo');
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { enviarConsumoAMonitoreo };
