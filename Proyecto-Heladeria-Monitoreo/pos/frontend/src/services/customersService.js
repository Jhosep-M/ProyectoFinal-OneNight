import { apiFetch } from './api.js';

export const listarClientes = () => apiFetch('/customers');
export const verCliente = (id) => apiFetch(`/customers/${id}`);
export const crearCliente = (data) => apiFetch('/customers', { method: 'POST', body: data });
export const actualizarCliente = (id, data) =>
  apiFetch(`/customers/${id}`, { method: 'PATCH', body: data });
