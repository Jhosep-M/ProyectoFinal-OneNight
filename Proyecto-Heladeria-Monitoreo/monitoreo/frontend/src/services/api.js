import { supabase } from './supabaseClient';

const BASE = '/api/v1';

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
<<<<<<< HEAD
<<<<<<< HEAD
=======
  delete: (ruta) => solicitud('DELETE', ruta),
>>>>>>> origin/feature/Airton-auxilio
=======
  delete: (ruta) => solicitud('DELETE', ruta),
>>>>>>> develop
};
