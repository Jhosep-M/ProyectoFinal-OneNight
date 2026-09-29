import { api } from './api';

export async function listar({ organizacionId, incluirInactivos = false }) {
  const q = new URLSearchParams({ organizacionId });
  if (incluirInactivos) q.set('incluirInactivos', '1');
  return api.get(`/medidores?${q}`);
}

export async function crear(payload) {
  return api.post('/medidores', payload);
}

export async function actualizar(id, campos) {
  return api.patch(`/medidores/${id}`, campos);
}

export async function eliminar(id) {
  return api.delete(`/medidores/${id}`);
}

export async function listarRecursos() {
  return api.get('/recursos');
}
