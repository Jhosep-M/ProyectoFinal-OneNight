import { api } from './api';

export async function listar({ organizacionId, incluirInactivos = false }) {
  const q = new URLSearchParams({ organizacionId });
  if (incluirInactivos) q.set('incluirInactivos', '1');
  return api.get(`/umbrales?${q}`);
}

export async function crear(payload) {
  return api.post('/umbrales', payload);
}

export async function actualizar(id, campos) {
  return api.patch(`/umbrales/${id}`, campos);
}

export async function eliminar(id) {
  return api.delete(`/umbrales/${id}`);
}
