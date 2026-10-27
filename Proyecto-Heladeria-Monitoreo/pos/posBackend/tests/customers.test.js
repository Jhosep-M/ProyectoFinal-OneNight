'use strict';

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key';

jest.mock('../src/config/database', () => ({ sequelize: { query: jest.fn(), transaction: jest.fn() } }));
jest.mock('../src/middlewares/authenticate', () => ({
  authenticateJWT: (req, _res, next) => {
    req.user = { id: '11111111-1111-4111-8111-111111111111' };
    next();
  },
}));
jest.mock('../src/middlewares/authorize', () => ({
  authorize: () => (_req, _res, next) => next(),
  authorizeAny: () => (_req, _res, next) => next(),
  requirePermission: () => (_req, _res, next) => next(),
}));
jest.mock('../src/utils/audit', () => ({ auditLog: jest.fn() }));

const request = require('supertest');
const { sequelize } = require('../src/config/database');
const { createApp } = require('../src/app');
const {
  createCustomerSchema,
  updateCustomerSchema,
  uuidParamSchema,
  listQuerySchema,
  ajustePuntosSchema,
} = require('../src/validators/customer');

const app = createApp();
const VALID_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

describe('validators/customer', () => {
  test('(a) create ignora puntos_fidelidad (strip unknown)', () => {
    const parsed = createCustomerSchema.parse({ nombre: 'Ana', telefono: '71098016', correo: 'ana@x.com', carnet_identidad: '1234567 LP', puntos_fidelidad: 999 });
    expect(parsed.nombre).toBe('Ana');
    expect(parsed.puntos_fidelidad).toBeUndefined();
    expect(parsed.carnet_identidad).toBe('1234567 LP');
  });

  test('(a2) create exige correo y telefono 8 digitos', () => {
    expect(() => createCustomerSchema.parse({ nombre: 'Ana', telefono: '71098016', carnet_identidad: '1234567 LP' })).toThrow();
    expect(() => createCustomerSchema.parse({ nombre: 'Ana', telefono: '123', correo: 'ana@x.com', carnet_identidad: '1234567 LP' })).toThrow();
    expect(() => createCustomerSchema.parse({ nombre: 'Ana', telefono: '71098016', correo: 'no-es-email', carnet_identidad: '1234567 LP' })).toThrow();
  });

  test('(a3) create exige carnet boliviano y normaliza', () => {
    expect(() => createCustomerSchema.parse({ nombre: 'Ana', telefono: '71098016', correo: 'ana@x.com' })).toThrow();
    expect(() => createCustomerSchema.parse({ nombre: 'Ana', telefono: '71098016', correo: 'ana@x.com', carnet_identidad: 'ABC' })).toThrow();
    expect(() => createCustomerSchema.parse({ nombre: 'Ana', telefono: '71098016', correo: 'ana@x.com', carnet_identidad: '123 LPZ' })).toThrow();
    expect(() => createCustomerSchema.parse({ nombre: 'Ana', telefono: '71098016', correo: 'ana@x.com', carnet_identidad: '12' })).toThrow();
    expect(createCustomerSchema.parse({ nombre: 'Ana', telefono: '71098016', correo: 'ana@x.com', carnet_identidad: '1234567 lp' }).carnet_identidad).toBe('1234567 LP');
    expect(createCustomerSchema.parse({ nombre: 'Ana', telefono: '71098016', correo: 'ana@x.com', carnet_identidad: '1234567 - 1a lp' }).carnet_identidad).toBe('1234567-1A LP');
    expect(createCustomerSchema.parse({ nombre: 'Ana', telefono: '71098016', correo: 'ana@x.com', carnet_identidad: '87654321-1B SC' }).carnet_identidad).toBe('87654321-1B SC');
  });

  test('(b) update con puntos_fidelidad lanza ZodError', () => {
    expect(() => updateCustomerSchema.parse({ puntos_fidelidad: 5 })).toThrow();
    try {
      updateCustomerSchema.parse({ puntos_fidelidad: 5 });
    } catch (e) {
      expect(e.name).toBe('ZodError');
    }
  });

  test('(c) uuidParamSchema rechaza no-uuid', () => {
    expect(() => uuidParamSchema.parse('no-uuid')).toThrow();
    expect(uuidParamSchema.parse(VALID_ID)).toBe(VALID_ID);
  });
});

describe('routes/customers', () => {
  beforeEach(() => jest.clearAllMocks());

  test('POST fuerza puntos_fidelidad=0 aunque body traiga valor', async () => {
    sequelize.query
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ id_cliente: VALID_ID, puntos_fidelidad: 0 }]]);
    const res = await request(app)
      .post('/api/v1/customers')
      .send({ nombre: 'Ana', telefono: '71098016', correo: 'ana@x.com', carnet_identidad: '1234567 LP', puntos_fidelidad: 999 });
    expect(res.status).toBe(201);
    const [, opts] = sequelize.query.mock.calls[1];
    expect(opts.replacements.puntos).toBe(0);
    expect(opts.replacements.correo).toBe('ana@x.com');
  });

  test('POST sin correo -> 400', async () => {
    const res = await request(app)
      .post('/api/v1/customers')
      .send({ nombre: 'Ana', telefono: '71098016', carnet_identidad: '1234567 LP' });
    expect(res.status).toBe(400);
    expect(sequelize.query).not.toHaveBeenCalled();
  });

  test('POST sin carnet -> 400', async () => {
    const res = await request(app)
      .post('/api/v1/customers')
      .send({ nombre: 'Ana', telefono: '71098016', correo: 'ana@x.com' });
    expect(res.status).toBe(400);
    expect(sequelize.query).not.toHaveBeenCalled();
  });

  test('POST carnet invalido -> 400 sin INSERT', async () => {
    const res = await request(app)
      .post('/api/v1/customers')
      .send({ nombre: 'Ana', telefono: '71098016', correo: 'ana@x.com', carnet_identidad: 'ABC123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(sequelize.query).not.toHaveBeenCalled();
  });

  test('POST carnet extension invalida -> 400 sin INSERT', async () => {
    const res = await request(app)
      .post('/api/v1/customers')
      .send({ nombre: 'Ana', telefono: '71098016', correo: 'ana@x.com', carnet_identidad: '1234567 XX' });
    expect(res.status).toBe(400);
    expect(sequelize.query).not.toHaveBeenCalled();
  });

  test('PATCH con puntos_fidelidad -> 400 sin UPDATE', async () => {
    const res = await request(app)
      .patch(`/api/v1/customers/${VALID_ID}`)
      .send({ puntos_fidelidad: 5 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(sequelize.query).not.toHaveBeenCalled();
  });

  test('GET /:id con id no-uuid -> 400', async () => {
    const res = await request(app).get('/api/v1/customers/no-uuid');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(sequelize.query).not.toHaveBeenCalled();
  });

  test('PATCH /:id con id no-uuid -> 400', async () => {
    const res = await request(app).patch('/api/v1/customers/no-uuid').send({ nombre: 'X' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(sequelize.query).not.toHaveBeenCalled();
  });

  test('POST duplicado por pre-chequeo (correo) -> 409 sin INSERT', async () => {
    sequelize.query.mockResolvedValueOnce([[{ id_cliente: VALID_ID, correo: 'ana@x.com', telefono: '11111111', carnet_identidad: '9999999 LP' }]]);
    const res = await request(app).post('/api/v1/customers').send({ nombre: 'Ana 2', telefono: '71098016', correo: 'ANA@x.com', carnet_identidad: '1234567 LP' });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Correo duplicado');
    expect(res.body.fields.correo).toMatch(/registrado/);
    expect(sequelize.query).toHaveBeenCalledTimes(1);
  });

  test('POST duplicado por pre-chequeo (telefono) -> 409 sin INSERT', async () => {
    sequelize.query.mockResolvedValueOnce([[{ id_cliente: VALID_ID, correo: 'otro@x.com', telefono: '71098016', carnet_identidad: '9999999 LP' }]]);
    const res = await request(app).post('/api/v1/customers').send({ nombre: 'Pedro', telefono: '71098016', correo: 'pedro@x.com', carnet_identidad: '1234567 LP' });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Teléfono duplicado');
    expect(res.body.fields.telefono).toMatch(/registrado/);
    expect(sequelize.query).toHaveBeenCalledTimes(1);
  });

  test('POST duplicado por pre-chequeo (carnet) -> 409 sin INSERT', async () => {
    sequelize.query.mockResolvedValueOnce([[{ id_cliente: VALID_ID, correo: 'otro@x.com', telefono: '72000001', carnet_identidad: '1234567 LP' }]]);
    const res = await request(app).post('/api/v1/customers').send({ nombre: 'Pedro', telefono: '71098016', correo: 'pedro@x.com', carnet_identidad: '1234567 lp' });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Carnet duplicado');
    expect(res.body.fields.carnet_identidad).toMatch(/registrado/);
    expect(sequelize.query).toHaveBeenCalledTimes(1);
  });

  test('POST nombre repetido con tel/correo distintos -> 201', async () => {
    sequelize.query
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ id_cliente: VALID_ID, nombre: 'Ana' }]]);
    const res = await request(app).post('/api/v1/customers').send({ nombre: 'Ana', telefono: '72000001', correo: 'ana2@x.com', carnet_identidad: '7654321 CB' });
    expect(res.status).toBe(201);
  });

  test('POST duplicado carrera (23505 telefono) -> 409 Telefono', async () => {
    const err = new Error('duplicate key value');
    err.code = '23505';
    err.constraint = 'ux_cliente_telefono';
    sequelize.query.mockResolvedValueOnce([[]]).mockRejectedValueOnce(err);
    const res = await request(app).post('/api/v1/customers').send({ nombre: 'Ana', telefono: '71098016', correo: 'ana@x.com', carnet_identidad: '1234567 LP' });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Teléfono duplicado');
  });

  test('POST duplicado (23505 correo) -> 409', async () => {
    const err = new Error('duplicate key value');
    err.code = '23505';
    err.constraint = 'ux_cliente_correo_lower';
    sequelize.query.mockResolvedValueOnce([[]]).mockRejectedValueOnce(err);
    const res = await request(app).post('/api/v1/customers').send({ nombre: 'Ana', telefono: '71098016', correo: 'ana@x.com', carnet_identidad: '1234567 LP' });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Correo duplicado');
  });

  test('POST duplicado (23505 carnet) -> 409', async () => {
    const err = new Error('duplicate key value');
    err.code = '23505';
    err.constraint = 'ux_cliente_carnet';
    sequelize.query.mockResolvedValueOnce([[]]).mockRejectedValueOnce(err);
    const res = await request(app).post('/api/v1/customers').send({ nombre: 'Ana', telefono: '71098016', correo: 'ana@x.com', carnet_identidad: '1234567 LP' });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Carnet duplicado');
  });

  test('PATCH duplicado (23505) -> 409', async () => {
    const err = new Error('duplicate key value');
    err.code = '23505';
    sequelize.query.mockRejectedValueOnce(err);
    const res = await request(app)
      .patch(`/api/v1/customers/${VALID_ID}`)
      .send({ nombre: 'Otro' });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Correo duplicado');
  });

  test('PATCH correo a existente (pre-chequeo) -> 409 sin UPDATE', async () => {
    sequelize.query.mockResolvedValueOnce([[{ id_cliente: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', correo: 'usado@x.com', telefono: '73000000' }]]);
    const res = await request(app)
      .patch(`/api/v1/customers/${VALID_ID}`)
      .send({ correo: 'USADO@x.com' });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Correo duplicado');
    expect(sequelize.query).toHaveBeenCalledTimes(1);
  });

  test('listQuerySchema coerce string "20"->20 con defaults', () => {
    const parsed = listQuerySchema.parse({ limit: '20' });
    expect(parsed.limit).toBe(20);
    expect(parsed.offset).toBe(0);
    expect(parsed.q).toBeUndefined();
  });

  test('GET / con q=ana usa ILIKE con replacements qlike=%ana%', async () => {
    sequelize.query.mockResolvedValueOnce([[]]);
    const res = await request(app).get('/api/v1/customers?q=ana');
    expect(res.status).toBe(200);
    const [sql, opts] = sequelize.query.mock.calls[0];
    expect(sql).toMatch(/ILIKE/);
    expect(opts.replacements.qlike).toBe('%ana%');
    expect(opts.replacements.q).toBe('ana');
  });

  test('GET /:id/ventas retorna array', async () => {
    sequelize.query
      .mockResolvedValueOnce([[{ id_cliente: VALID_ID }]])
      .mockResolvedValueOnce([[{ id_venta: VALID_ID, total: 10, estado: 'activa', fecha: '2026-09-30' }]]);
    const res = await request(app).get(`/api/v1/customers/${VALID_ID}/ventas`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('ajustePuntosSchema puntos=0 -> ZodError', () => {
    expect(() => ajustePuntosSchema.parse({ puntos: 0, tipo: 'ajuste', motivo: 'correccion' })).toThrow();
    try {
      ajustePuntosSchema.parse({ puntos: 0, tipo: 'ajuste', motivo: 'correccion' });
    } catch (e) {
      expect(e.name).toBe('ZodError');
    }
  });

  test('POST /:id/ajustes-puntos valido llama INSERT+UPDATE y retorna 201', async () => {
    const commit = jest.fn();
    const rollback = jest.fn();
    sequelize.transaction.mockResolvedValueOnce({ commit, rollback });
    sequelize.query
      .mockResolvedValueOnce([[{ id_cliente: VALID_ID, puntos_fidelidad: 100 }]])
      .mockResolvedValueOnce([[{ id_movimiento: VALID_ID, cliente_id: VALID_ID, puntos: 50, tipo: 'ajuste', motivo: 'bono' }]])
      .mockResolvedValueOnce([[{ id_cliente: VALID_ID, puntos_fidelidad: 150 }]]);
    const res = await request(app)
      .post(`/api/v1/customers/${VALID_ID}/ajustes-puntos`)
      .send({ puntos: 50, tipo: 'ajuste', motivo: 'bono' });
    expect(res.status).toBe(201);
    expect(res.body.cliente.puntos_fidelidad).toBe(150);
    expect(res.body.movimiento.puntos).toBe(50);
    const calls = sequelize.query.mock.calls;
    expect(calls[0][0]).toMatch(/FOR UPDATE/);
    expect(calls[1][0]).toMatch(/INSERT INTO movimiento_puntos/);
    expect(calls[2][0]).toMatch(/UPDATE cliente SET puntos_fidelidad/);
    expect(commit).toHaveBeenCalled();
    expect(rollback).not.toHaveBeenCalled();
  });

  test('POST /:id/ajustes-puntos saldo insuficiente -> 422 con rollback', async () => {
    const commit = jest.fn();
    const rollback = jest.fn();
    sequelize.transaction.mockResolvedValueOnce({ commit, rollback });
    sequelize.query.mockResolvedValueOnce([[{ id_cliente: VALID_ID, puntos_fidelidad: 10 }]]);
    const res = await request(app)
      .post(`/api/v1/customers/${VALID_ID}/ajustes-puntos`)
      .send({ puntos: -50, tipo: 'canje', motivo: 'canje premio' });
    expect(res.status).toBe(422);
    expect(res.body.error).toBe('Saldo insuficiente');
    expect(rollback).toHaveBeenCalled();
    expect(commit).not.toHaveBeenCalled();
    expect(sequelize.query).toHaveBeenCalledTimes(1);
  });

  test('POST /:id/ajustes-puntos puntos=0 -> 400 sin transaction', async () => {
    const res = await request(app)
      .post(`/api/v1/customers/${VALID_ID}/ajustes-puntos`)
      .send({ puntos: 0, tipo: 'ajuste', motivo: 'bono' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(sequelize.transaction).not.toHaveBeenCalled();
  });

  test('DELETE elimina cliente sin historial -> 200 con DELETE FROM', async () => {
    sequelize.query
      .mockResolvedValueOnce([[{ id_cliente: VALID_ID, nombre: 'Ana' }]])
      .mockResolvedValueOnce([[{ total: 0 }]])
      .mockResolvedValueOnce([[{ total: 0 }]])
      .mockResolvedValueOnce([[{ id_cliente: VALID_ID }]]);
    const res = await request(app).delete(`/api/v1/customers/${VALID_ID}`);
    expect(res.status).toBe(200);
    expect(res.body.eliminado).toBe(VALID_ID);
    const calls = sequelize.query.mock.calls;
    expect(calls[1][0]).toMatch(/FROM venta/);
    expect(calls[2][0]).toMatch(/FROM movimiento_puntos/);
    expect(calls[3][0]).toMatch(/DELETE FROM cliente/);
  });

  test('DELETE con id no-uuid -> 400', async () => {
    const res = await request(app).delete('/api/v1/customers/no-uuid');
    expect(res.status).toBe(400);
    expect(sequelize.query).not.toHaveBeenCalled();
  });

  test('DELETE cliente inexistente -> 404', async () => {
    sequelize.query.mockResolvedValueOnce([[]]);
    const res = await request(app).delete(`/api/v1/customers/${VALID_ID}`);
    expect(res.status).toBe(404);
  });

  test('DELETE cliente con ventas -> 409 sin DELETE', async () => {
    sequelize.query
      .mockResolvedValueOnce([[{ id_cliente: VALID_ID, nombre: 'Ana' }]])
      .mockResolvedValueOnce([[{ total: 2 }]]);
    const res = await request(app).delete(`/api/v1/customers/${VALID_ID}`);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/ventas/);
    const sqls = sequelize.query.mock.calls.map((c) => c[0]).join(' ');
    expect(sqls).not.toMatch(/DELETE FROM cliente/);
  });

  test('DELETE cliente con movimientos puntos -> 409 sin DELETE', async () => {
    sequelize.query
      .mockResolvedValueOnce([[{ id_cliente: VALID_ID, nombre: 'Ana' }]])
      .mockResolvedValueOnce([[{ total: 0 }]])
      .mockResolvedValueOnce([[{ total: 3 }]]);
    const res = await request(app).delete(`/api/v1/customers/${VALID_ID}`);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/movimientos/);
    const sqls = sequelize.query.mock.calls.map((c) => c[0]).join(' ');
    expect(sqls).not.toMatch(/DELETE FROM cliente/);
  });
});
