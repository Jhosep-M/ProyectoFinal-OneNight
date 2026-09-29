import { api } from './api.js';

// userId siempre del JWT en backend (AGENTS §4.1); aquí solo JWT en header.
export const productosService = {
  list: () => api.get('/api/v1/products'),
  get: (id) => api.get(`/api/v1/products/${id}`),
  create: (data) => api.post('/api/v1/products', data),
  update: (id, data) => api.patch(`/api/v1/products/${id}`, data),
  inactivate: (id) => api.remove(`/api/v1/products/${id}`),
};

export const categoriasService = {
  list: () => api.get('/api/v1/categories'),
  get: (id) => api.get(`/api/v1/categories/${id}`),
  create: (data) => api.post('/api/v1/categories', data),
  update: (id, data) => api.patch(`/api/v1/categories/${id}`, data),
  inactivate: (id) => api.remove(`/api/v1/categories/${id}`),
};
