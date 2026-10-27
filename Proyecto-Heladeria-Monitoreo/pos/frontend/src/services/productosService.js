import { api } from './api.js';

// userId siempre del JWT en backend (AGENTS §4.1); aquí solo JWT en header.
export const productosService = {
  list: () => api.get('/api/v1/products'),
  get: (id) => api.get(`/api/v1/products/${id}`),
  create: (data) => api.post('/api/v1/products', data),
  update: (id, data) => api.patch(`/api/v1/products/${id}`, data),
  inactivate: (id) => api.remove(`/api/v1/products/${id}`),
};

const CAT_TTL_MS = 5 * 60 * 1000;
let catCache = { data: null, ts: 0 };

function catCacheValida() {
  return catCache.data && Date.now() - catCache.ts < CAT_TTL_MS;
}

export const categoriasService = {
  // Cache 5min: las categorías casi no cambian y Ventas las pide en cada
  // carga. Reduce GET /categories y evita 429 con varias pestañas.
  list: async ({ force = false } = {}) => {
    if (!force && catCacheValida()) return catCache.data;
    const data = await api.get('/api/v1/categories');
    catCache = { data, ts: Date.now() };
    return data;
  },
  get: (id) => api.get(`/api/v1/categories/${id}`),
  create: async (data) => {
    const r = await api.post('/api/v1/categories', data);
    catCache = { data: null, ts: 0 };
    return r;
  },
  update: async (id, data) => {
    const r = await api.patch(`/api/v1/categories/${id}`, data);
    catCache = { data: null, ts: 0 };
    return r;
  },
  inactivate: async (id) => {
    const r = await api.remove(`/api/v1/categories/${id}`);
    catCache = { data: null, ts: 0 };
    return r;
  },
};
