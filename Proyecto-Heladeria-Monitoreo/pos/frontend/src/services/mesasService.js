import { apiFetch } from './api.js';

export const listarMesas = () => apiFetch('/mesas');
export const verMesa = (id) => apiFetch(`/mesas/${id}`);
export const crearMesa = (numero) => apiFetch('/mesas', { method: 'POST', body: { numero } });
