import { api } from './api';

export async function listar({ organizacionId, nivel, desde, hasta }) {
  const q = new URLSearchParams({ organizacionId });
  if (nivel) q.set('nivel', nivel);
  if (desde) q.set('desde', desde);
  if (hasta) q.set('hasta', hasta);
  return api.get(`/alertas?${q}`);
}
