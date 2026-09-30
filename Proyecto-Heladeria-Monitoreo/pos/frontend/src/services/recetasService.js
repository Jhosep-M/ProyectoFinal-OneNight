import { api } from './api.js';

// CRUD receta_insumo(producto_id, insumo_id, cantidad_requerida).
// Backend: GET/POST/PATCH/DELETE /api/v1/recipes (a crear en posBackend).
// Si el backend aún no existe (404), el caller debe degradar a solo-lectura.
export const recetasService = {
  list: (producto_id) => api.get(`/api/v1/recipes?producto_id=${producto_id}`),
  create: (data) => api.post('/api/v1/recipes', data),
  update: (id, data) => api.patch(`/api/v1/recipes/${id}`, data),
  remove: (id) => api.remove(`/api/v1/recipes/${id}`),
};
