import { apiFetch } from './api.js';

export const listarPedidos = () => apiFetch('/orders');
export const crearPedido = ({ mesa_id, items }) =>
  apiFetch('/orders', { method: 'POST', body: { mesa_id, items } });
export const actualizarPedido = (id, cambios) =>
  apiFetch(`/orders/${id}`, { method: 'PATCH', body: cambios });
export const verPedido = (id) => apiFetch(`/orders/${id}`);
export const cobrarPedido = (id, { turno_id, pagos }) =>
  apiFetch(`/orders/${id}/cobrar`, { method: 'POST', body: { turno_id, pagos } });
