import { apiFetch } from './api.js';

export const listarPromociones = () => apiFetch('/promotions');
export const verPromocion = (id) => apiFetch(`/promotions/${id}`);
export const crearPromocion = (data) => apiFetch('/promotions', { method: 'POST', body: data });
export const actualizarPromocion = (id, data) =>
  apiFetch(`/promotions/${id}`, { method: 'PATCH', body: data });
