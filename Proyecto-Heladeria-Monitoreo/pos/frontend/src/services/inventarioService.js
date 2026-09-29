import { api } from './api.js';

export const inventarioService = {
  insumos: () => api.get('/api/v1/inventory/insumos'),
  insumo: (id) => api.get(`/api/v1/inventory/insumos/${id}`),
  crearInsumo: (data) => api.post('/api/v1/inventory/insumos', data),
  actualizarInsumo: (id, data) => api.patch(`/api/v1/inventory/insumos/${id}`, data),
  movimientos: () => api.get('/api/v1/inventory/movimientos'),
  // tipo: ingreso|salida|ajuste — actualiza stock en transacción
  movimiento: (data) => api.post('/api/v1/inventory/movimientos', data),
};

export const proveedoresService = {
  list: () => api.get('/api/v1/suppliers'),
  get: (id) => api.get(`/api/v1/suppliers/${id}`),
  create: (data) => api.post('/api/v1/suppliers', data),
  update: (id, data) => api.patch(`/api/v1/suppliers/${id}`, data),
  inactivate: (id) => api.remove(`/api/v1/suppliers/${id}`),
};
