import { supabase } from './supabaseClient';

const BASE = '/api/v1';

async function token() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function solicitud(metodo, ruta, cuerpo, reintento429 = true) {
  const t = await token();
  const res = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
    ...(cuerpo !== undefined ? { body: JSON.stringify(cuerpo) } : {}),
  });
  // 429: espera Retry-After (tope 5s) y reintenta una vez en vez de fallar.
  if (res.status === 429 && reintento429) {
    const espera = Math.min(Number(res.headers.get('Retry-After')) || 2, 5) * 1000;
    await new Promise((r) => setTimeout(r, espera));
    return solicitud(metodo, ruta, cuerpo, false);
  }
  const cuerpoRes = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(res.status === 429 ? 'Límite de peticiones excedido, espera unos segundos y reintenta' : (cuerpoRes.error || `Error ${res.status}`));
    err.status = res.status;
    err.detail = cuerpoRes.detail;
    throw err;
  }
  return cuerpoRes;
}

export const api = {
  get: (ruta) => solicitud('GET', ruta),
  post: (ruta, cuerpo) => solicitud('POST', ruta, cuerpo),
  patch: (ruta, cuerpo) => solicitud('PATCH', ruta, cuerpo),
};
