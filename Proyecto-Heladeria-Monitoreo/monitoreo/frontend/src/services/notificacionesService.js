import { api } from './api';

export async function listar() {
  return api.get('/notificaciones');
}

export async function marcarVista(id) {
  return api.patch(`/notificaciones/${id}`, { accion: 'vista' });
}
