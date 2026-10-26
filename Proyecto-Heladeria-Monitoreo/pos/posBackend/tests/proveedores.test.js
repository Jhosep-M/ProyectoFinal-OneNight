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
  requirePermission: () => (_req, _res, next) => next(),
  authorizeAny: () => (_req, _res, next) => next(),
}));
jest.mock('../src/utils/audit', () => ({ auditLog: jest.fn() }));

const fs = require('fs');
const path = require('path');
const request = require('supertest');
const { sequelize } = require('../src/config/database');
const { createApp } = require('../src/app');
const { createSupplierSchema, updateSupplierSchema } = require('../src/validators/supplier');
const { suppliersRouter } = require('../src/routes/suppliers');
const { uniqueViolationTarget } = require('../src/utils/dbErrors');

const app = createApp();
const VALID_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function uniqueError(constraint) {
  const err = new Error(`duplicate key value violates unique constraint "${constraint}"`);
  err.code = '23505';
  err.constraint = constraint;
  return err;
}

describe('Task3 proveedores', () => {
  beforeEach(() => jest.clearAllMocks());

  it('valida crear y rechaza nombre vacio', () => {
    const s = createSupplierSchema.parse({ nombre: 'Lacteos SA', nit: '123' });
    expect(s.nombre).toBe('Lacteos SA');
    expect(() => createSupplierSchema.parse({ nombre: '' })).toThrow();
  });

  it('normaliza el correo a minusculas y sin espacios', () => {
    const creado = createSupplierSchema.parse({ nombre: 'Lacteos SA', correo: '  Proveedor@Ejemplo.COM ' });
    const actualizado = updateSupplierSchema.parse({ correo: ' OTRO@Ejemplo.COM ' });
    expect(creado.correo).toBe('proveedor@ejemplo.com');
    expect(actualizado.correo).toBe('otro@ejemplo.com');
  });

  it('update parcial exige un campo y valida correo', () => {
    expect(() => updateSupplierSchema.parse({})).toThrow();
    expect(() => updateSupplierSchema.parse({ correo: 'no-es-correo' })).toThrow();
    expect(updateSupplierSchema.parse({ estado: 'inactivo' }).estado).toBe('inactivo');
  });

  it('router expone CRUD', () => {
    expect(suppliersRouter).toBeTruthy();
    const layers = suppliersRouter.stack.map((l) => l.route && `${Object.keys(l.route.methods)[0].toUpperCase()} ${l.route.path}`);
    for (const want of ['GET /', 'GET /:id', 'POST /', 'PATCH /:id', 'DELETE /:id']) {
      expect(layers).toContain(want);
    }
  });

  it('clasifica violaciones unicas por constraint', () => {
    expect(uniqueViolationTarget(uniqueError('ux_proveedor_correo_lower'))).toBe('correo');
    expect(uniqueViolationTarget(uniqueError('proveedor_nit_key'))).toBe('nit');
    expect(uniqueViolationTarget(new Error('otro error'))).toBeNull();
  });

  it('POST correo duplicado -> 409 Correo duplicado', async () => {
    sequelize.query.mockRejectedValueOnce(uniqueError('ux_proveedor_correo_lower'));
    const res = await request(app).post('/api/v1/suppliers').send({ nombre: 'Proveedor', correo: 'a@b.com' });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Correo duplicado');
  });

  it('POST NIT duplicado -> 409 NIT duplicado', async () => {
    sequelize.query.mockRejectedValueOnce(uniqueError('proveedor_nit_key'));
    const res = await request(app).post('/api/v1/suppliers').send({ nombre: 'Proveedor', nit: '123' });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('NIT duplicado');
  });

  it('PATCH correo duplicado -> 409 Correo duplicado', async () => {
    sequelize.query.mockRejectedValueOnce(uniqueError('ux_proveedor_correo_lower'));
    const res = await request(app).patch(`/api/v1/suppliers/${VALID_ID}`).send({ correo: 'a@b.com' });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Correo duplicado');
  });

  it('PATCH NIT duplicado -> 409 NIT duplicado', async () => {
    sequelize.query.mockRejectedValueOnce(uniqueError('proveedor_nit_key'));
    const res = await request(app).patch(`/api/v1/suppliers/${VALID_ID}`).send({ nit: '123' });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('NIT duplicado');
  });

  it.each([
    ['GET', '/api/v1/suppliers/no-uuid'],
    ['PATCH', '/api/v1/suppliers/no-uuid'],
    ['DELETE', '/api/v1/suppliers/no-uuid'],
  ])('%s %s con id no-UUID -> 400 (no 500 por 22P02)', async (method, url) => {
    const res = await request(app)[method.toLowerCase()](url).send(method === 'PATCH' ? { nombre: 'X' } : undefined);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('POST exitoso envia el correo normalizado', async () => {
    sequelize.query.mockResolvedValueOnce([[{ id_proveedor: VALID_ID }]]);
    const res = await request(app).post('/api/v1/suppliers').send({ nombre: 'Proveedor', correo: ' A@B.COM ' });
    expect(res.status).toBe(201);
    const [, opts] = sequelize.query.mock.calls[0];
    expect(opts.replacements.correo).toBe('a@b.com');
  });

  it('migracion 016 crea indice unico case-insensitive', () => {
    const sql = fs.readFileSync(
      path.join(__dirname, '..', '..', '..', 'database', 'pos', 'migrations', '016-proveedor-correo-unico.sql'),
      'utf8'
    );
    expect(sql).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS ux_proveedor_correo_lower/i);
    expect(sql).toMatch(/lower\(correo\)/i);
  });

  describe('DELETE definitivo (?definitivo=true)', () => {
    it('sin param sigue inactivando (retrocompatible)', async () => {
      sequelize.query.mockResolvedValueOnce([[{ id_proveedor: VALID_ID, estado: 'inactivo' }]]);
      const res = await request(app).delete(`/api/v1/suppliers/${VALID_ID}`);
      expect(res.status).toBe(200);
      expect(res.body.estado).toBe('inactivo');
    });

    it('activo + definitivo=true -> 409 PROVEEDOR_ACTIVO', async () => {
      sequelize.query.mockResolvedValueOnce([[{ id_proveedor: VALID_ID, estado: 'activo' }]]);
      const res = await request(app).delete(`/api/v1/suppliers/${VALID_ID}?definitivo=true`);
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('PROVEEDOR_ACTIVO');
    });

    it('inactivo sin movimientos + definitivo=true -> 200 elimina fila', async () => {
      sequelize.query
        .mockResolvedValueOnce([[{ id_proveedor: VALID_ID, estado: 'inactivo' }]])
        .mockResolvedValueOnce([[{ count: '0' }]])
        .mockResolvedValueOnce([[{ id_proveedor: VALID_ID, nombre: 'Viejo' }]]);
      const { auditLog } = require('../src/utils/audit');
      const res = await request(app).delete(`/api/v1/suppliers/${VALID_ID}?definitivo=true`);
      expect(res.status).toBe(200);
      expect(res.body.id_proveedor).toBe(VALID_ID);
      expect(auditLog).toHaveBeenCalledWith(expect.objectContaining({ accion: 'proveedor.eliminar' }));
      const deleteCall = sequelize.query.mock.calls.find(([sql]) => /DELETE FROM proveedor/i.test(sql));
      expect(deleteCall).toBeTruthy();
    });

    it('inactivo con movimientos + definitivo=true -> 409 PROVEEDOR_CON_HISTORIAL', async () => {
      sequelize.query
        .mockResolvedValueOnce([[{ id_proveedor: VALID_ID, estado: 'inactivo' }]])
        .mockResolvedValueOnce([[{ count: '2' }]]);
      const res = await request(app).delete(`/api/v1/suppliers/${VALID_ID}?definitivo=true`);
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('PROVEEDOR_CON_HISTORIAL');
    });

    it('inexistente + definitivo=true -> 404', async () => {
      sequelize.query.mockResolvedValueOnce([[]]);
      const res = await request(app).delete(`/api/v1/suppliers/${VALID_ID}?definitivo=true`);
      expect(res.status).toBe(404);
    });
  });
});
