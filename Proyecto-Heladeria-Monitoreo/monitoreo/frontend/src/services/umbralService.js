import { api } from './api';

export async function listar({ organizacionId }) {
  const q = new URLSearchParams({ organizacionId });
  return api.get(`/umbrales?${q}`);
}

export async function crear(payload) {
  return api.post('/umbrales', payload);
}

export async function actualizar(id, campos) {
  return api.patch(`/umbrales/${id}`, campos);
}
