import { supabase } from './supabaseClient';

// Base unificada: VITE_API_URL ya incluye /api/v1 (ej. https://api.../api/v1).
// En dev el fallback '/api/v1' sigue funcionando con el proxy de vite.config.js.
// Mismo contrato que pos/frontend/src/services/api.js.
const BASE = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/$/, '');

async function token() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function solicitud(metodo, ruta, cuerpo) {
  const t = await token();
  const res = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
    ...(cuerpo !== undefined ? { body: JSON.stringify(cuerpo) } : {}),
  });
  const cuerpoRes = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(cuerpoRes.error || `Error ${res.status}`);
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
  delete: (ruta) => solicitud('DELETE', ruta),
};
