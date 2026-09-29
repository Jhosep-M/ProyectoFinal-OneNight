import { api } from './api';

export async function listar({ organizacionId, page = 1, limit = 25, desde, hasta }) {
  const q = new URLSearchParams({ organizacionId, page: String(page), limit: String(limit) });
  if (desde) q.set('desde', desde);
  if (hasta) q.set('hasta', hasta);
  return api.get(`/consumo?${q}`);
}
