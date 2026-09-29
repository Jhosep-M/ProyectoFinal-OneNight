import { apiFetch } from './api.js';

export const listarUsuarios = () => apiFetch('/users');
export const verUsuario = (id) => apiFetch(`/users/${id}`);
export const crearUsuario = (data) => apiFetch('/users', { method: 'POST', body: data });
export const actualizarUsuario = (id, data) =>
  apiFetch(`/users/${id}`, { method: 'PATCH', body: data });
