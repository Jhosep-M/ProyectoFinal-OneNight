import { api } from './api';

<<<<<<< HEAD
export async function listar({ organizacionId }) {
  const q = new URLSearchParams({ organizacionId });
=======
export async function listar({ organizacionId, incluirInactivos = false }) {
  const q = new URLSearchParams({ organizacionId });
  if (incluirInactivos) q.set('incluirInactivos', '1');
>>>>>>> origin/feature/Airton-auxilio
  return api.get(`/metas?${q}`);
}

export async function crear(payload) {
  return api.post('/metas', payload);
}

export async function actualizar(id, campos) {
  return api.patch(`/metas/${id}`, campos);
}
<<<<<<< HEAD
=======

export async function eliminar(id) {
  return api.delete(`/metas/${id}`);
}
>>>>>>> origin/feature/Airton-auxilio
