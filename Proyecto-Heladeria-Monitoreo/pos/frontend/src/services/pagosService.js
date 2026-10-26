import { apiFetch } from './api.js';
import { listarMetodosPago } from './ventasService.js';

// HU-20 — Catálogo de métodos de pago (admin).
export const listarMetodosAdmin = () => listarMetodosPago();
export const crearMetodo = (nombre) =>
  apiFetch('/payments/metodos', { method: 'POST', body: { nombre } });
export const actualizarMetodo = (id, estado) =>
  apiFetch(`/payments/metodos/${id}`, { method: 'PATCH', body: { estado } });
