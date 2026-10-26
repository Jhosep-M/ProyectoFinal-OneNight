import { apiFetch } from './api.js';

// HU-14: filtros opcionales de historial (desde/hasta/estado/cajero/método).
// Sin params mantiene la llamada original exacta (compat Dashboard/Caja).
export const listarVentas = (params) => {
  if (!params) return apiFetch('/sales');
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  ).toString();
  return apiFetch(qs ? `/sales?${qs}` : '/sales');
};
export const crearVenta = ({ turno_id, items, pagos, cliente_id, descuento = 0, puntos_canje = 0 }) =>
  apiFetch('/sales', { method: 'POST', body: { turno_id, items, pagos, cliente_id, descuento, puntos_canje } });
export const anularVenta = (id, motivo) =>
  apiFetch(`/sales/${id}/anular`, { method: 'POST', body: { motivo } });
export const listarMetodosPago = () => apiFetch('/payments/metodos');
