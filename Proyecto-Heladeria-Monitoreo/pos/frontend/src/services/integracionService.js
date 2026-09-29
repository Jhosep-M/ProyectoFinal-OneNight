import { apiFetch } from './api.js';

export const listarCola = ({ estado, limit = 50, offset = 0 } = {}) => {
  const params = new URLSearchParams();
  if (estado) params.set('estado', estado);
  params.set('limit', limit);
  params.set('offset', offset);
  const qs = params.toString();
  return apiFetch(`/integrations${qs ? `?${qs}` : ''}`);
};

export const listarColaPendiente = () => apiFetch('/integrations/cola?estado=pendiente');

export const reintentarCola = (id) =>
  apiFetch(`/integrations/${id}/reintentar`, { method: 'POST' });
