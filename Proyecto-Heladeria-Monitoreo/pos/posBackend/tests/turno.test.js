'use strict';

/* Bloque 1 — Turnos: abrir (INSERT, ux_turno_abierto 23505 = doble turno),
 * cerrar (delega a public.cerrar_turno y retorna JSONB con
 * diferencia/alerta/consumos). Sin DB ni red real.
 */

jest.mock('../src/config/database', () => ({
  sequelize: { query: jest.fn() },
}));

const { sequelize } = require('../src/config/database');
const turnoService = require('../src/services/turnoService');
const { abrirTurnoSchema, cerrarTurnoSchema } = require('../src/validators/shifts');

const USER_ID = '33333333-3333-4333-8333-333333333333';
const TURNO_ID = '44444444-4444-4444-8444-444444444444';

describe('turnoService.abrir', () => {
  beforeEach(() => jest.clearAllMocks());

  test('inserta turno abierto y retorna la fila creada', async () => {
    const fila = { id_turno: TURNO_ID, usuario_id: USER_ID, estado: 'abierto' };
    sequelize.query.mockResolvedValueOnce([[fila]]);
    const out = await turnoService.abrir(USER_ID, 100);
    expect(out).toEqual(fila);
    const [sql, opts] = sequelize.query.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO turno_caja/);
    expect(opts.replacements).toEqual({ uid: USER_ID, monto: 100 });
  });

  test('rechaza monto_inicial negativo sin tocar la DB', async () => {
    await expect(turnoService.abrir(USER_ID, -5)).rejects.toThrow(/monto_inicial/i);
    expect(sequelize.query).not.toHaveBeenCalled();
  });

  test('propaga el 23505 de ux_turno_abierto para que la ruta lo mapee a 409', async () => {
    const err = new Error('duplicate key value violates unique constraint "ux_turno_abierto"');
    err.original = { code: '23505' };
    sequelize.query.mockRejectedValueOnce(err);
    await expect(turnoService.abrir(USER_ID, 50)).rejects.toMatchObject({ original: { code: '23505' } });
  });
});

describe('turnoService.cerrar', () => {
  beforeEach(() => jest.clearAllMocks());

  test('delega a cerrar_turno y retorna el JSONB (diferencia, alerta, consumos)', async () => {
    const jsonb = {
      exito: true,
      turnoId: TURNO_ID,
      montoEsperado: 150.5,
      montoReal: 145,
      diferencia: -5.5,
      alertaGenerada: false,
      alertaId: null,
      consumoAguaId: 'aaaaaaa1-1111-4111-8111-111111111111',
      consumoEnergiaId: 'bbbbbb22-2222-4222-8222-222222222222',
    };
    sequelize.query.mockResolvedValueOnce([[{ result: jsonb }]]);
    const out = await turnoService.cerrar(TURNO_ID, 145, USER_ID);
    expect(out).toEqual(jsonb);
    const [sql, opts] = sequelize.query.mock.calls[0];
    expect(sql).toMatch(/cerrar_turno/);
    expect(opts.replacements).toEqual({ id: TURNO_ID, monto: 145, uid: USER_ID });
  });

  test('rechaza monto_final_real negativo sin tocar la DB', async () => {
    await expect(turnoService.cerrar(TURNO_ID, -1, USER_ID)).rejects.toThrow(/monto_final_real/i);
    expect(sequelize.query).not.toHaveBeenCalled();
  });

  test('exige userId sin tocar la DB', async () => {
    await expect(turnoService.cerrar(TURNO_ID, 100)).rejects.toThrow(/usuario obligatorio/i);
    expect(sequelize.query).not.toHaveBeenCalled();
  });

  test('propaga el error de turno no abierto de PG', async () => {
    sequelize.query.mockRejectedValueOnce(new Error('El turno no está abierto. Estado actual: cerrado'));
    await expect(turnoService.cerrar(TURNO_ID, 100, USER_ID)).rejects.toThrow(/no está abierto/);
  });
});

describe('validators shifts', () => {
  test('abrir rechaza monto_inicial negativo', () => {
    expect(abrirTurnoSchema.safeParse({ monto_inicial: -1 }).success).toBe(false);
  });

  test('cerrar rechaza monto_final_real negativo y acepta cero', () => {
    expect(cerrarTurnoSchema.safeParse({ monto_final_real: -1 }).success).toBe(false);
    expect(cerrarTurnoSchema.safeParse({ monto_final_real: 0 }).success).toBe(true);
  });
});
