import { apiFetch } from './api.js';

// Opción A: mis turnos vs todos (solo lectura) vs permisos.
export const listarTurnos = () => apiFetch('/shifts');
export const listarMisTurnos = () => apiFetch('/shifts');
export const listarTodosTurnos = async () => {
  try {
    return await apiFetch('/shifts/todos');
  } catch (e) {
    // Sin turno.consultar.todos -> 403: no es error fatal, solo oculta la lista global.
    if (String(e.message || '').includes('403') || String(e.message || '').includes('Forbidden')) return null;
    throw e;
  }
};
// Opción A mesero cobra: turno abierto de caja (cualquiera) para cobrar
// sin abrir caja propia. Exige venta.crear. Sin turno -> null (404 SIN_TURNO).
export const listarTurnoAbiertoParaCobro = async () => {
  try {
    return await apiFetch('/shifts/abierto');
  } catch (e) {
    const msg = String(e.message || '');
    if (msg.includes('404') || msg.includes('SIN_TURNO') || msg.includes('No hay caja abierta')) return null;
    if (msg.includes('403') || msg.includes('Forbidden')) return null;
    throw e;
  }
};
export const obtenerPermisosTurno = async () => {
  try {
    return await apiFetch('/shifts/permisos');
  } catch {
    return { puedeCerrarTodos: false, puedeConsultarTodos: false };
  }
};
export const abrirTurno = (monto_inicial) =>
  apiFetch('/shifts', { method: 'POST', body: { monto_inicial } });
export const cerrarTurno = (id, payload) =>
  apiFetch(`/shifts/${id}/cerrar`, {
    method: 'POST',
    // Compat: cerrarTurno(id, 120) o cerrarTurno(id, { monto_final_real: 120, motivo }).
    body: typeof payload === 'number' ? { monto_final_real: payload } : payload,
  });
