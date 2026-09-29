import { api } from './api';

export async function listar({ organizacionId }) {
  const q = new URLSearchParams({ organizacionId });
  return api.get(`/tarifas?${q}`);
}

export async function crear(payload) {
  return api.post('/tarifas', payload);
}

export async function actualizar(id, campos) {
  return api.patch(`/tarifas/${id}`, campos);
}
