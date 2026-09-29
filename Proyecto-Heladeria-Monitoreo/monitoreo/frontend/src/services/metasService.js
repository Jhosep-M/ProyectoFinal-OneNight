import { api } from './api';

export async function listar({ organizacionId, incluirInactivos = false }) {
  const q = new URLSearchParams({ organizacionId });
  if (incluirInactivos) q.set('incluirInactivos', '1');
  return api.get(`/metas?${q}`);
}

export async function crear(payload) {
  return api.post('/metas', payload);
}

export async function actualizar(id, campos) {
  return api.patch(`/metas/${id}`, campos);
}

export async function eliminar(id) {
  return api.delete(`/metas/${id}`);
}
