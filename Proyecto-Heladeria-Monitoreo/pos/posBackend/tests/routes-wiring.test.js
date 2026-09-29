'use strict';

/* Bloque 1 — Capas: routes/sales y routes/shifts delegan en los services
 * (nada de SQL inline para escribir). Sin DB ni red real.
 */

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key';

jest.mock('../src/config/database', () => ({
  sequelize: { query: jest.fn() },
}));

jest.mock('../src/middlewares/authenticate', () => ({
  authenticateJWT: (req, _res, next) => {
    req.user = { id: 'u-test' };
    next();
  },
}));

jest.mock('../src/middlewares/authorize', () => ({
  authorize: () => (_req, _res, next) => next(),
  requirePermission: () => (_req, _res, next) => next(),
}));

jest.mock('../src/services/ventaService', () => ({
  crear: jest.fn(),
  anular: jest.fn(),
}));

jest.mock('../src/services/turnoService', () => ({
  abrir: jest.fn(),
  cerrar: jest.fn(),
}));

const request = require('supertest');
const ventaService = require('../src/services/ventaService');
const turnoService = require('../src/services/turnoService');
const { createApp } = require('../src/app');

const app = createApp();
const UUID = (c) => `${c}1111111-1111-4111-8111-111111111111`.slice(0, 36);

describe('routes sales -> ventaService', () => {
  beforeEach(() => jest.clearAllMocks());

  test('POST / delega en crear con userId del JWT y descuento del body', async () => {
    ventaService.crear.mockResolvedValueOnce('v-1');
    const res = await request(app).post('/api/v1/sales').send({
      turno_id: UUID('a'),
      items: [{ producto_id: UUID('b'), cantidad: 2 }],
      descuento: 5,
      pagos: [{ metodo_pago_id: UUID('c'), monto: 15 }],
    });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ venta_id: 'v-1' });
    expect(ventaService.crear).toHaveBeenCalledWith({
      turno_id: UUID('a'),
      items: [{ producto_id: UUID('b'), cantidad: 2 }],
      pagos: [{ metodo_pago_id: UUID('c'), monto: 15 }],
      userId: 'u-test',
      descuento: 5,
    });
  });

  test('POST / con body invalido -> 400 sin tocar el service', async () => {
    const res = await request(app).post('/api/v1/sales').send({ turno_id: 'x', items: [], pagos: [] });
    expect(res.status).toBe(400);
    expect(ventaService.crear).not.toHaveBeenCalled();
  });

  test('POST /:id/anular delega en anular', async () => {
    ventaService.anular.mockResolvedValueOnce(undefined);
    const res = await request(app).post(`/api/v1/sales/${UUID('d')}/anular`).send({ motivo: 'Venta duplicada' });
    expect(res.status).toBe(200);
    expect(ventaService.anular).toHaveBeenCalledWith(UUID('d'), 'Venta duplicada', 'u-test');
  });
});

describe('routes shifts -> turnoService', () => {
  beforeEach(() => jest.clearAllMocks());

  test('POST / delega en abrir; 23505 -> 409', async () => {
    turnoService.abrir.mockResolvedValueOnce({ id_turno: 't-1' });
    const ok = await request(app).post('/api/v1/shifts').send({ monto_inicial: 100 });
    expect(ok.status).toBe(201);
    expect(turnoService.abrir).toHaveBeenCalledWith('u-test', 100);

    const err = new Error('duplicado');
    err.original = { code: '23505' };
    turnoService.abrir.mockRejectedValueOnce(err);
    const dup = await request(app).post('/api/v1/shifts').send({ monto_inicial: 50 });
    expect(dup.status).toBe(409);
  });

  test('POST /:id/cerrar delega en cerrar', async () => {
    turnoService.cerrar.mockResolvedValueOnce({ exito: true, diferencia: 0 });
    const res = await request(app).post(`/api/v1/shifts/${UUID('e')}/cerrar`).send({ monto_final_real: 120 });
    expect(res.status).toBe(200);
    expect(turnoService.cerrar).toHaveBeenCalledWith(UUID('e'), 120);
  });
});
