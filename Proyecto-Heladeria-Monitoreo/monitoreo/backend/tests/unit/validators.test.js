require('../helpers/env');
const { test } = require('node:test');
const assert = require('node:assert');

test('organizacionSchema exige nombre (1-120) y opcionaliza nit', () => {
  const { organizacionSchema } = require('../../src/validators/organizacion.validator');
  assert.ok(organizacionSchema.safeParse({ nombre: 'Heladería Norte' }).success);
  assert.ok(!organizacionSchema.safeParse({}).success, 'nombre obligatorio');
  assert.ok(!organizacionSchema.safeParse({ nombre: 'x'.repeat(121) }).success, 'máx 120');
  assert.ok(organizacionSchema.safeParse({ nombre: 'Ok', nit: 'NIT-1' }).success);
});

test('medidorSchema exige codigoMedidor con patrón seguro y unicidad implícita', () => {
  const { medidorSchema } = require('../../src/validators/medidor.validator');
  const base = { organizacionId: '11111111-1111-4111-8111-111111111111', tipoRecursoId: '11111111-1111-4111-8111-111111111111', nombre: 'Medidor' };
  assert.ok(medidorSchema.safeParse({ ...base, codigoMedidor: 'MED-AGUA-01' }).success);
  assert.ok(!medidorSchema.safeParse({ ...base, codigoMedidor: "'; DROP TABLE x;--" }).success, 'sin SQL injection');
  assert.ok(!medidorSchema.safeParse({ ...base, codigoMedidor: 'con espacios' }).success);
  assert.ok(!medidorSchema.safeParse({ ...base, codigoMedidor: '' }).success);
});

test('usuarioOrganizacionSchema valida UUIDs y estado', () => {
  const { usuarioOrganizacionSchema } = require('../../src/validators/usuarioOrganizacion.validator');
  const ok = {
    usuarioId: '22222222-2222-4222-8222-222222222222',
    email: 'a@b.co',
    organizacionId: '11111111-1111-4111-8111-111111111111',
    rolId: '33333333-3333-4333-8333-333333333333',
  };
  assert.ok(usuarioOrganizacionSchema.safeParse(ok).success);
  assert.ok(!usuarioOrganizacionSchema.safeParse({ ...ok, usuarioId: 'no-uuid' }).success);
  assert.ok(!usuarioOrganizacionSchema.safeParse({ ...ok, email: 'sin-arroba' }).success);
});

test('recursoSchema solo acepta agua/energia', () => {
  const { recursoSchema } = require('../../src/validators/recurso.validator');
  assert.ok(recursoSchema.safeParse({ codigo: 'agua', nombre: 'Agua', unidadBase: 'litros' }).success);
  assert.ok(recursoSchema.safeParse({ codigo: 'energia', nombre: 'Energía', unidadBase: 'kwh' }).success);
  assert.ok(!recursoSchema.safeParse({ codigo: 'gas', nombre: 'Gas', unidadBase: 'm3' }).success);
});
