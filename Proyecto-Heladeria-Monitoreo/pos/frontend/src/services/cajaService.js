import { apiFetch } from './api.js';

export const listarTurnos = () => apiFetch('/shifts');
export const abrirTurno = (monto_inicial) =>
  apiFetch('/shifts', { method: 'POST', body: { monto_inicial } });
export const cerrarTurno = (id, monto_final_real) =>
  apiFetch(`/shifts/${id}/cerrar`, { method: 'POST', body: { monto_final_real } });
