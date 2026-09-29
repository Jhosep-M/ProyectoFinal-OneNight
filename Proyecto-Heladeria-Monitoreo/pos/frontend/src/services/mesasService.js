import { apiFetch } from './api.js';

export const listarMesas = () => apiFetch('/mesas');
export const verMesa = (id) => apiFetch(`/mesas/${id}`);
<<<<<<< HEAD
export const crearMesa = (numero) => {
  const n = typeof numero === 'number' ? numero : parseInt(String(numero).replace(/\D/g, ''), 10);
  return apiFetch('/mesas', { method: 'POST', body: { numero: n } });
};
export const actualizarMesa = (id, cambios) =>
  apiFetch(`/mesas/${id}`, { method: 'PATCH', body: cambios });
=======
export const crearMesa = (numero) => apiFetch('/mesas', { method: 'POST', body: { numero } });
>>>>>>> origin/feature/Airton-auxilio
