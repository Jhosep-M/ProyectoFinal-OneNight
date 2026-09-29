import { api } from './api';

export async function listar({ organizacionId }) {
  const q = new URLSearchParams({ organizacionId });
  return api.get(`/medidores?${q}`);
}

export async function crear(payload) {
  return api.post('/medidores', payload);
}

export async function actualizar(id, campos) {
  return api.patch(`/medidores/${id}`, campos);
}

// Caché corto + deduplicación en vuelo: 4 vistas piden /recursos al montar
// (x2 con StrictMode) y el rate limit es 100 req/15min. Sin esto se agota.
let cacheRecursos = null;
let cacheRecursosEn = 0;
let vueloRecursos = null;
const TTL_MS = 60000;

export async function listarRecursos() {
  const ahora = Date.now();
  if (cacheRecursos && ahora - cacheRecursosEn < TTL_MS) return cacheRecursos;
  if (!vueloRecursos) {
    vueloRecursos = api.get('/recursos').then((r) => {
      cacheRecursos = r;
      cacheRecursosEn = Date.now();
      return r;
    }).finally(() => { vueloRecursos = null; });
  }
  return vueloRecursos;
}

export function invalidarCacheRecursos() {
  cacheRecursos = null;
}
