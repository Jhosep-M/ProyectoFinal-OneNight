import { api } from './api';

<<<<<<< HEAD
<<<<<<< HEAD
export async function listar({ organizacionId }) {
  const q = new URLSearchParams({ organizacionId });
=======
export async function listar({ organizacionId, incluirInactivos = false }) {
  const q = new URLSearchParams({ organizacionId });
  if (incluirInactivos) q.set('incluirInactivos', '1');
>>>>>>> origin/feature/Airton-auxilio
=======
export async function listar({ organizacionId, incluirInactivos = false }) {
  const q = new URLSearchParams({ organizacionId });
  if (incluirInactivos) q.set('incluirInactivos', '1');
>>>>>>> develop
  return api.get(`/umbrales?${q}`);
}

export async function crear(payload) {
  return api.post('/umbrales', payload);
}

export async function actualizar(id, campos) {
  return api.patch(`/umbrales/${id}`, campos);
}
<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
>>>>>>> develop

export async function eliminar(id) {
  return api.delete(`/umbrales/${id}`);
}
<<<<<<< HEAD
>>>>>>> origin/feature/Airton-auxilio
=======
>>>>>>> develop
