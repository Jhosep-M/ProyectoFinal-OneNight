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
      motivo: null,
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
    expect(opts.replacements).toEqual({ id: TURNO_ID, monto: 145, uid: USER_ID, motivo: null });
  });

  test('reenvía el motivo cuando se cierra con diferencia sobre el umbral', async () => {
    sequelize.query.mockResolvedValueOnce([[{ result: { exito: true } }]]);
    await turnoService.cerrar(TURNO_ID, 200, USER_ID, 'Faltante por vuelto');
    const [, opts] = sequelize.query.mock.calls[0];
    expect(opts.replacements).toEqual({ id: TURNO_ID, monto: 200, uid: USER_ID, motivo: 'Faltante por vuelto' });
  });

  test('propaga el MOTIVO_REQUERIDO de PG (la ruta lo mapea a 422)', async () => {
    sequelize.query.mockRejectedValueOnce(
      new Error('MOTIVO_REQUERIDO|diferencia=120.00|esperado=80.00|umbral=50.00|ajeno=false')
    );
    await expect(turnoService.cerrar(TURNO_ID, 200, USER_ID)).rejects.toThrow(/MOTIVO_REQUERIDO/);
  });

  test('cierra con diferencia 20 (< umbral 50) sin motivo', async () => {
    const jsonb = { exito: true, montoEsperado: 100, montoReal: 120, diferencia: 20, motivo: null };
    sequelize.query.mockResolvedValueOnce([[{ result: jsonb }]]);
    const out = await turnoService.cerrar(TURNO_ID, 120, USER_ID);
    expect(out).toEqual(jsonb);
    const [, opts] = sequelize.query.mock.calls[0];
    expect(opts.replacements.motivo).toBeNull();
  });

  test('cierra con diferencia 120 (> umbral) y motivo >= 5', async () => {
    const jsonb = { exito: true, montoEsperado: 80, montoReal: 200, diferencia: 120, motivo: 'faltante de caja' };
    sequelize.query.mockResolvedValueOnce([[{ result: jsonb }]]);
    const out = await turnoService.cerrar(TURNO_ID, 200, USER_ID, 'faltante de caja');
    expect(out).toEqual(jsonb);
  });

  test('propaga DIFERENCIA_CRITICA de PG (la ruta lo mapea a 409 aun con motivo)', async () => {
    sequelize.query.mockRejectedValueOnce(
      new Error('DIFERENCIA_CRITICA|diferencia=150.00|esperado=100.00|umbral=50.00|ajeno=false')
    );
    await expect(turnoService.cerrar(TURNO_ID, 250, USER_ID, 'motivo largo suficiente')).rejects.toThrow(/DIFERENCIA_CRITICA/);
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

  test('cerrar acepta sin motivo y exige >=5 cuando viene', () => {
    expect(cerrarTurnoSchema.safeParse({ monto_final_real: 10 }).success).toBe(true);
    expect(cerrarTurnoSchema.safeParse({ monto_final_real: 10, motivo: 'abc' }).success).toBe(false);
    expect(cerrarTurnoSchema.safeParse({ monto_final_real: 10, motivo: 'faltante de caja' }).success).toBe(true);
  });
});
