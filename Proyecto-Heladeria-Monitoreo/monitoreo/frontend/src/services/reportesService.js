import { api } from './api';

export async function consumo({ organizacionId, desde, hasta }) {
  const q = new URLSearchParams({ organizacionId });
  if (desde) q.set('desde', desde);
  if (hasta) q.set('hasta', hasta);
  return api.get(`/reportes/consumo?${q}`);
}

export async function topExcesos({ organizacionId, desde, hasta }) {
  const q = new URLSearchParams({ organizacionId });
  if (desde) q.set('desde', desde);
  if (hasta) q.set('hasta', hasta);
  return api.get(`/reportes/top-excesos?${q}`);
}
