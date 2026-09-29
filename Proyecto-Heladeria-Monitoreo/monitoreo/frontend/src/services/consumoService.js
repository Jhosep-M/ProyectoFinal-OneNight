import { api } from './api';

export async function listar({ organizacionId, page = 1, limit = 25, desde, hasta, recurso, medidorId }) {
  const q = new URLSearchParams({ organizacionId, page: String(page), limit: String(limit) });
  if (desde) q.set('desde', desde);
  if (hasta) q.set('hasta', hasta);
  if (recurso) q.set('recurso', recurso);
  if (medidorId) q.set('medidorId', medidorId);
  return api.get(`/consumo?${q}`);
}
