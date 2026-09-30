import { apiFetch } from './api.js';

export const listarVentas = () => apiFetch('/sales');
export const crearVenta = ({ turno_id, items, pagos, cliente_id, descuento = 0, puntos_canje = 0 }) =>
  apiFetch('/sales', { method: 'POST', body: { turno_id, items, pagos, cliente_id, descuento, puntos_canje } });
export const anularVenta = (id, motivo) =>
  apiFetch(`/sales/${id}/anular`, { method: 'POST', body: { motivo } });
export const listarMetodosPago = () => apiFetch('/payments/metodos');
export const crearDevolucion = ({ venta_id, producto_id, cantidad, motivo }) =>
  apiFetch('/returns', { method: 'POST', body: { venta_id, producto_id, cantidad, motivo } });
