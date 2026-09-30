'use strict';

/* Opción A — Turno por cajero estricto.
 * RED: estos tests deben FALLAR antes de implementar
 * listarMios / listarTodos / permisos + mapeo 403/409 en cerrar.
 */

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key';

jest.mock('../src/config/database', () => ({
  sequelize: { query: jest.fn() },
}));

jest.mock('../src/middlewares/authenticate', () => ({
  authenticateJWT: (req, _res, next) => {
    req.user = { id: 'u-mio' };
    next();
  },
}));

jest.mock('../src/middlewares/authorize', () => {
  const perms = { allowed: new Set() };
  const authorize = (perm) => (_req, res, next) => {
    if (perms.allowed.has(perm)) return next();
    return res.status(403).json({ error: 'Forbidden' });
  };
  authorize.__setAllowed = (list) => {
    perms.allowed = new Set(list);
  };
  return { authorize, requirePermission: authorize };
});

jest.mock('../src/services/turnoService', () => ({
  abrir: jest.fn(),
  cerrar: jest.fn(),
}));

const request = require('supertest');
const { sequelize } = require('../src/config/database');
const { authorize } = require('../src/middlewares/authorize');
const turnoService = require('../src/services/turnoService');
const { createApp } = require('../src/app');

const app = createApp();
const UUID = (c) => `${c}1111111-1111-4111-8111-111111111111`.slice(0, 36);

describe('shifts ownership (Opción A)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authorize.__setAllowed([
      'turno.consultar',
      'turno.consultar.todos',
      'turno.abrir',
      'turno.cerrar',
    ]);
  });

  test('GET / solo devuelve mis turnos (filtra por usuario_id)', async () => {
    sequelize.query.mockResolvedValueOnce([[{ id_turno: 't-mio', usuario_id: 'u-mio' }]]);
    const res = await request(app).get('/api/v1/shifts');
    expect(res.status).toBe(200);
    const [sql, opts] = sequelize.query.mock.calls[0];
    expect(sql).toMatch(/WHERE.*usuario_id\s*=\s*:uid/i);
    expect(opts.replacements.uid).toBe('u-mio');
    // No debe usar la rama OR EXISTS turno.consultar.todos en la lista propia
    expect(sql).not.toMatch(/turno\.consultar\.todos/);
  });

  test('GET /todos exige turno.consultar.todos y trae dueño', async () => {
    sequelize.query.mockResolvedValueOnce([[{ id_turno: 't-1', cajero_email: 'a@x.com' }]]);
    const res = await request(app).get('/api/v1/shifts/todos');
    expect(res.status).toBe(200);
    const [sql] = sequelize.query.mock.calls[0];
    expect(sql).toMatch(/LEFT JOIN|JOIN.*usuario/i);

    // Sin permiso -> 403 sin tocar DB
    authorize.__setAllowed(['turno.consultar']);
    jest.clearAllMocks();
    const denied = await request(app).get('/api/v1/shifts/todos');
    expect(denied.status).toBe(403);
    expect(sequelize.query).not.toHaveBeenCalled();
  });

  test('GET /permisos retorna puedeCerrarTodos / puedeConsultarTodos', async () => {
    sequelize.query.mockResolvedValueOnce([[{ puede_cerrar_todos: false, puede_consultar_todos: true }]]);
    const res = await request(app).get('/api/v1/shifts/permisos');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ puedeCerrarTodos: false, puedeConsultarTodos: true });
  });

  test('POST /:id/cerrar mapea turno ajeno a 403 y turno ya cerrado a 409', async () => {
    turnoService.cerrar.mockRejectedValueOnce(new Error('No autorizado a cerrar turno ajeno'));
    const forbidden = await request(app)
      .post(`/api/v1/shifts/${UUID('e')}/cerrar`)
      .send({ monto_final_real: 120 });
    expect(forbidden.status).toBe(403);

    turnoService.cerrar.mockRejectedValueOnce(new Error('El turno no está abierto. Estado actual: cerrado'));
    const conflict = await request(app)
      .post(`/api/v1/shifts/${UUID('e')}/cerrar`)
      .send({ monto_final_real: 120 });
    expect(conflict.status).toBe(409);
  });
});
