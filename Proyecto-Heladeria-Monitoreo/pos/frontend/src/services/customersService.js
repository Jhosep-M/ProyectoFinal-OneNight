import { apiFetch } from './api.js';

export const listarClientes = (params = {}) => {
  const qs = new URLSearchParams();
  const { q, estado, limit, offset } = params;
  if (q !== undefined && q !== null && q !== '') qs.set('q', q);
  if (estado !== undefined && estado !== null && estado !== '') qs.set('estado', estado);
  if (limit !== undefined && limit !== null && limit !== '') qs.set('limit', limit);
  if (offset !== undefined && offset !== null && offset !== '') qs.set('offset', offset);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return apiFetch(`/customers${suffix}`);
};
export const verCliente = (id) => apiFetch(`/customers/${id}`);
export const crearCliente = (data) => apiFetch('/customers', { method: 'POST', body: data });
export const actualizarCliente = (id, data) =>
  apiFetch(`/customers/${id}`, { method: 'PATCH', body: data });
export const ajustarPuntos = (id, data) =>
  apiFetch(`/customers/${id}/ajustes-puntos`, { method: 'POST', body: data });
export const verVentasCliente = (id) => apiFetch(`/customers/${id}/ventas`);
