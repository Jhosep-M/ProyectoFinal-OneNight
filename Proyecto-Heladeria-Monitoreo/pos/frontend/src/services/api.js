import { createClient } from '@supabase/supabase-js';

// Solo anon-key publica. El JWT del usuario se obtiene de la sesion
// y viaja como Bearer; el userId siempre se deriva del JWT en el backend.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Base unificada: VITE_API_URL ya incluye /api/v1
// (ej. http://localhost:3000/api/v1). Se normaliza sin trailing slash.
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1').replace(/\/$/, '');
// Alias historico (rama persona2) — misma base.
export const BASE = API_URL;

// Evita duplicar /api/v1 cuando el caller pasa ruta absoluta
// ('/api/v1/products' + base '.../api/v1' -> '.../api/v1/products').
function joinUrl(path) {
  const clean = path.startsWith('/api/v1/') && API_URL.endsWith('/api/v1')
    ? path.slice('/api/v1'.length) || '/'
    : path;
  return `${API_URL}${clean.startsWith('/') ? clean : `/${clean}`}`;
}

export async function apiFetch(path, { method = 'GET', body } = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch(joinUrl(path), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  const payload = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(payload?.error || `HTTP ${res.status}`);
  }
  return payload;
}

// Wrapper historico (rama persona2: api.get/post/patch/remove).
// Reutiliza apiFetch para usar JWT de Supabase (AGENTS §4.1),
// en vez del token de localStorage de la version en conflicto.
async function request(path, options = {}) {
  const { method = 'GET', body } = options;
  const parsed = body !== undefined ? JSON.parse(body) : undefined;
  return apiFetch(path, { method, body: parsed });
}

export const api = {
  get: (path) => request(path),
  post: (path, data) => request(path, { method: 'POST', body: JSON.stringify(data) }),
  patch: (path, data) => request(path, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (path) => request(path, { method: 'DELETE' }),
};
