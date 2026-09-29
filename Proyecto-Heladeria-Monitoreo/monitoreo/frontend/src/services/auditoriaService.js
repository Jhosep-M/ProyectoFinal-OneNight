import { api } from './api';

export async function listar({ organizacionId, page = 1, limit = 25, desde, hasta }) {
  const q = new URLSearchParams({ organizacionId, page: String(page), limit: String(limit) });
  if (desde) q.set('desde', desde);
  if (hasta) q.set('hasta', hasta);
  try {
    return await api.get(`/reportes/auditoria?${q}`);
  } catch (e) {
    if (e.status === 404) return { data: [], total: 0, pendienteBackend: true };
    throw e;
  }
}
