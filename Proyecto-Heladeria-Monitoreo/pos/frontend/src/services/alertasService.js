import { apiFetch } from './api.js';

// Alertas recibidas de Monitoreo (alerta_pos con turno_id NULL).
export const listarAlertasMonitoreo = ({ limit = 10 } = {}) =>
  apiFetch(`/integrations/alerts?limit=${limit}`);
