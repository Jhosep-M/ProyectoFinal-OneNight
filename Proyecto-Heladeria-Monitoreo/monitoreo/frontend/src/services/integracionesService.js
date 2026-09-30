import { api } from './api';

// CRUD de credenciales de integración POS (JWT + RBAC).
// Par backend: monitoreo/backend/src/routes/integraciones.routes.js
// montado en /api/v1/integraciones. NO confundir con /api/v1/integrations
// (ingesta máquina-a-máquina con API key).
// Endpoints exactos del backend:
//   GET   /integraciones?organizacionId=UUID
//   POST  /integraciones { organizacionId, nombre } -> { integracion, apiKey }
//   PATCH /integraciones/:id { accion: 'rotar' }    -> { integracion, apiKey }
//   PATCH /integraciones/:id { estado }             -> integracion
// La apiKey en plaintext solo viaja en la respuesta de crear/rotar:
// se muestra una sola vez y jamás se persiste en el frontend.

export async function listar({ organizacionId }) {
  const q = new URLSearchParams({ organizacionId });
  return api.get(`/integraciones?${q}`);
}

export async function crear({ organizacionId, nombre }) {
  return api.post('/integraciones', { organizacionId, nombre });
}

export async function rotar(id) {
  return api.patch(`/integraciones/${id}`, { accion: 'rotar' });
}

export async function cambiarEstado(id, estado) {
  return api.patch(`/integraciones/${id}`, { estado });
}
