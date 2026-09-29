'use strict';

/* Bloque 1 — Pedidos: el vocabulario de estado debe coincidir con el CHECK
 * PG de public.pedido:
 *   CHECK (estado IN ('abierto','en_preparacion','listo','cerrado','cancelado'))
 * 'entregado'/'cobrado' rebotan en DB. Sin DB ni red real.
 */

const { createOrderSchema, updateOrderSchema } = require('../src/validators/orders');

const ITEM = { producto_id: '22222222-2222-4222-8222-222222222222', cantidad: 1 };

describe('createOrderSchema — vocabulario DB', () => {
  test("acepta 'listo' (pedido preparado)", () => {
    const r = createOrderSchema.safeParse({ estado: 'listo', items: [ITEM] });
    expect(r.success).toBe(true);
  });

  test("acepta 'cerrado' (pedido cobrado)", () => {
    const r = createOrderSchema.safeParse({ estado: 'cerrado', items: [ITEM] });
    expect(r.success).toBe(true);
  });

  test("rechaza 'entregado' (no existe en el CHECK PG)", () => {
    const r = createOrderSchema.safeParse({ estado: 'entregado', items: [ITEM] });
    expect(r.success).toBe(false);
  });

  test("rechaza 'cobrado' (no existe en el CHECK PG)", () => {
    const r = createOrderSchema.safeParse({ estado: 'cobrado', items: [ITEM] });
    expect(r.success).toBe(false);
  });

  test('rechaza items vacios', () => {
    expect(createOrderSchema.safeParse({ estado: 'abierto', items: [] }).success).toBe(false);
  });
});

describe('updateOrderSchema — vocabulario DB', () => {
  test("acepta transicion a 'cerrado'", () => {
    expect(updateOrderSchema.safeParse({ estado: 'cerrado' }).success).toBe(true);
  });

  test("rechaza 'cobrado'", () => {
    expect(updateOrderSchema.safeParse({ estado: 'cobrado' }).success).toBe(false);
  });

  test('rechaza objeto vacio', () => {
    expect(updateOrderSchema.safeParse({}).success).toBe(false);
  });
});
