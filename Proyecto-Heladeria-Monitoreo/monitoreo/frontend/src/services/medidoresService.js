import { api } from './api';

export async function listar({ organizacionId }) {
  const q = new URLSearchParams({ organizacionId });
  return api.get(`/medidores?${q}`);
}

export async function crear(payload) {
  return api.post('/medidores', payload);
}

export async function actualizar(id, campos) {
  return api.patch(`/medidores/${id}`, campos);
}

export async function listarRecursos() {
  return api.get('/recursos');
}
