'use strict';

/* Bloque 1 — Ventas: service delega a PG public.registrar_venta / anular_venta.
 * Firmas PG reales (verificadas en Supabase tras fix de deriva):
 *   registrar_venta(p_usuario_id uuid, p_turno_id uuid, p_cliente_id uuid,
 *                   p_items jsonb, p_descuento numeric, p_pagos jsonb,
 *                   p_idempotency_key text DEFAULT NULL,
 *                   p_puntos_canje integer DEFAULT 0)
 *   anular_venta(p_venta_id uuid, p_usuario_id uuid, p_motivo varchar)
 * Sin DB ni red real.
 */

jest.mock('../src/config/database', () => ({
  sequelize: { query: jest.fn() },
}));

const { sequelize } = require('../src/config/database');
const ventaService = require('../src/services/ventaService');

const USER_ID = '33333333-3333-4333-8333-333333333333';
const TURNO_ID = '44444444-4444-4444-8444-444444444444';
const PRODUCTO_ID = '22222222-2222-4222-8222-222222222222';
const METODO_ID = '55555555-5555-4555-8555-555555555555';
const VENTA_ID = '11111111-1111-4111-8111-111111111111';

describe('ventaService.crear — delegacion a registrar_venta', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sequelize.query.mockResolvedValue([[{ venta_id: VENTA_ID }]]);
  });

  test('envia posicionales como (uid, turno, cliente, items, desc, pagos, idem, canje)', async () => {
    const items = [{ producto_id: PRODUCTO_ID, cantidad: 2 }];
    const pagos = [{ metodo_pago_id: METODO_ID, monto: 20.5 }];
    const out = await ventaService.crear({ turno_id: TURNO_ID, items, pagos, userId: USER_ID });

    expect(out).toBe(VENTA_ID);
    expect(sequelize.query).toHaveBeenCalledTimes(1);
    const [sql, opts] = sequelize.query.mock.calls[0];
    expect(sql).toMatch(/registrar_venta/);
    const positional = sql
      .split('registrar_venta(')[1]
      .split(')')[0]
      .split(',')
      .map((s) => s.trim().replace(/^:/, '').replace(/::jsonb$/, ''));
    expect(positional).toEqual(['uid', 'turno', 'cliente', 'items', 'desc', 'pagos', 'idem', 'canje']);
    expect(opts.replacements.uid).toBe(USER_ID);
    expect(opts.replacements.turno).toBe(TURNO_ID);
    expect(opts.replacements.cliente).toBeNull();
    expect(opts.replacements.idem).toBeNull();
    expect(opts.replacements.canje).toBe(0);
    expect(JSON.parse(opts.replacements.items)).toEqual(items);
    expect(JSON.parse(opts.replacements.pagos)).toEqual(pagos);
  });

  test('propaga cliente_id cuando se informa', async () => {
    const cliente = '66666666-6666-4666-8666-666666666666';
    await ventaService.crear({
      turno_id: TURNO_ID,
      items: [{ producto_id: PRODUCTO_ID, cantidad: 1 }],
      pagos: [{ metodo_pago_id: METODO_ID, monto: 10 }],
      userId: USER_ID,
      cliente_id: cliente,
    });
    const [, opts] = sequelize.query.mock.calls[0];
    expect(opts.replacements.cliente).toBe(cliente);
  });

  test('propaga puntos_canje cuando se informa', async () => {
    const cliente = '66666666-6666-4666-8666-666666666666';
    await ventaService.crear({
      turno_id: TURNO_ID,
      items: [{ producto_id: PRODUCTO_ID, cantidad: 1 }],
      pagos: [{ metodo_pago_id: METODO_ID, monto: 5 }],
      userId: USER_ID,
      cliente_id: cliente,
      puntos_canje: 5,
    });
    const [, opts] = sequelize.query.mock.calls[0];
    expect(opts.replacements.canje).toBe(5);
  });

  test('propaga idempotencyKey cuando se informa; ausente -> NULL (compat)', async () => {
    const key = '123e4567-e89b-12d3-a456-426614174099';
    await ventaService.crear({
      turno_id: TURNO_ID,
      items: [{ producto_id: PRODUCTO_ID, cantidad: 1 }],
      pagos: [{ metodo_pago_id: METODO_ID, monto: 10 }],
      userId: USER_ID,
      idempotencyKey: key,
    });
    const [, opts] = sequelize.query.mock.calls[0];
    expect(opts.replacements.idem).toBe(key);
  });
});

describe('ventaService.anular — delegacion a anular_venta', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sequelize.query.mockResolvedValue([[]]);
  });

  test('envia posicionales como (venta, uid, motivo)', async () => {
    await ventaService.anular(VENTA_ID, 'Venta duplicada', USER_ID);
    expect(sequelize.query).toHaveBeenCalledTimes(1);
    const [sql, opts] = sequelize.query.mock.calls[0];
    expect(sql).toMatch(/anular_venta/);
    const positional = sql
      .split('anular_venta(')[1]
      .split(')')[0]
      .split(',')
      .map((s) => s.trim().replace(/^:/, ''));
    expect(positional).toEqual(['venta', 'uid', 'motivo']);
    expect(opts.replacements).toEqual({ venta: VENTA_ID, uid: USER_ID, motivo: 'Venta duplicada' });
  });
});
