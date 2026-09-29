import { api } from './api';

export async function resumen({ organizacionId, desde, hasta }) {
  const q = new URLSearchParams({ organizacionId });
  if (desde) q.set('desde', desde);
  if (hasta) q.set('hasta', hasta);
  const [consumo, alertas] = await Promise.all([
    api.get(`/consumo?${q}&page=1&limit=100`),
    api.get(`/alertas?${q}&page=1&limit=10`),
  ]);
  return { consumo: consumo.data ?? [], totalConsumo: consumo.total ?? 0, alertas: alertas.data ?? [] };
}
