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
// Cache 5min: los métodos de pago casi no cambian y Ventas/Pedidos los
// piden en cada carga y cobro. Reduce GET /payments/metodos (fuente de 429).
const METODOS_TTL_MS = 5 * 60 * 1000;
let metodosCache = { data: null, ts: 0 };
export const listarMetodosPago = async ({ force = false } = {}) => {
  if (!force && metodosCache.data && Date.now() - metodosCache.ts < METODOS_TTL_MS) {
    return metodosCache.data;
  }
  const data = await apiFetch('/payments/metodos');
  metodosCache = { data, ts: Date.now() };
  return data;
};
