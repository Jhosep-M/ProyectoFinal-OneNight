'use strict';

/* Bloque 1 — Pagos: el estado debe coincidir con el CHECK PG de public.pago:
 *   CHECK (estado IN ('pendiente','confirmado','anulado','reembolsado'))
 * 'rechazado' rebota en DB. Sin DB ni red real.
 */

const { createPagoSchema } = require('../src/validators/payments');

const BASE = {
  venta_id: '11111111-1111-4111-8111-111111111111',
  metodo_pago_id: '55555555-5555-4555-8555-555555555555',
  monto: 20.5,
};

describe('createPagoSchema — vocabulario DB', () => {
  test("acepta 'anulado'", () => {
    expect(createPagoSchema.safeParse({ ...BASE, estado: 'anulado' }).success).toBe(true);
  });

  test("rechaza 'rechazado' (no existe en el CHECK PG)", () => {
    expect(createPagoSchema.safeParse({ ...BASE, estado: 'rechazado' }).success).toBe(false);
  });

  test('estado por defecto es confirmado', () => {
    const r = createPagoSchema.safeParse(BASE);
    expect(r.success).toBe(true);
    expect(r.data.estado).toBe('confirmado');
  });

  test('rechaza monto <= 0', () => {
    expect(createPagoSchema.safeParse({ ...BASE, monto: 0 }).success).toBe(false);
    expect(createPagoSchema.safeParse({ ...BASE, monto: -3 }).success).toBe(false);
  });

  test('rechaza venta_id no-uuid', () => {
    expect(createPagoSchema.safeParse({ ...BASE, venta_id: 'no-uuid' }).success).toBe(false);
  });
});
