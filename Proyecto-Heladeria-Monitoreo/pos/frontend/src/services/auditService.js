import { apiFetch } from './api.js';

export const listarAuditoria = ({
  accion,
  entidad,
  usuario_id,
  desde,
  hasta,
  limit = 50,
  offset = 0,
} = {}) => {
  const params = new URLSearchParams();
  if (accion) params.set('accion', accion);
  if (entidad) params.set('entidad', entidad);
  if (usuario_id) params.set('usuario_id', usuario_id);
  if (desde) params.set('desde', desde);
  if (hasta) params.set('hasta', hasta);
  params.set('limit', limit);
  params.set('offset', offset);
  const qs = params.toString();
  return apiFetch(`/audit${qs ? `?${qs}` : ''}`);
};
