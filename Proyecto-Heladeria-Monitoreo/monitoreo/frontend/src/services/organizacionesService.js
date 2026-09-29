import { api } from './api';

export async function listar() {
  return api.get('/organizaciones');
}

export async function crear({ nombre, nit }) {
  const cuerpo = { nombre };
  if (nit) cuerpo.nit = nit;
  return api.post('/organizaciones', cuerpo);
}

export async function actualizar(id, campos) {
  return api.patch(`/organizaciones/${id}`, campos);
}
