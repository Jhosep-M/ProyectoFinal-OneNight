import { api } from './api';

export async function listar({ organizacionId }) {
  const q = new URLSearchParams({ organizacionId });
  return api.get(`/metas?${q}`);
}

export async function crear(payload) {
  return api.post('/metas', payload);
}

export async function actualizar(id, campos) {
  return api.patch(`/metas/${id}`, campos);
}
