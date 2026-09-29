import { api } from './api';

export async function listar({ organizacionId, nivel, desde, hasta }) {
  const q = new URLSearchParams({ organizacionId });
  if (nivel) q.set('nivel', nivel);
  if (desde) q.set('desde', desde);
  if (hasta) q.set('hasta', hasta);
  return api.get(`/alertas?${q}`);
}

export async function acusar(id) { return api.post(`/alertas/${id}/acusar`, {}); }
export async function resolver(id) { return api.post(`/alertas/${id}/resolver`, {}); }
export async function reenviar(id) { return api.post(`/alertas/${id}/reenviar`, {}); }
