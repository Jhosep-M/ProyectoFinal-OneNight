'use strict';

/* Bloque 1 — Devoluciones: service delega a PG public.procesar_devolucion.
 * Firma PG real (verificada en Supabase):
 *   procesar_devolucion(p_venta_id uuid, p_producto_id uuid, p_cantidad integer,
 *                        p_usuario_id uuid, p_motivo varchar)
 * El service debe enviar los posicionales en ese orden: venta, producto,
 * cantidad, uid, motivo. Sin DB ni red real.
 */

jest.mock('../src/config/database', () => ({
  sequelize: { query: jest.fn() },
}));

const { sequelize } = require('../src/config/database');
const devolucionService = require('../src/services/devolucionService');

const VENTA_ID = '11111111-1111-4111-8111-111111111111';
const PRODUCTO_ID = '22222222-2222-4222-8222-222222222222';
const USER_ID = '33333333-3333-4333-8333-333333333333';

describe('devolucionService.procesar — orden de argumentos PG', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sequelize.query.mockResolvedValue([[{ result: 'dev-id' }]]);
  });

  test('envia posicionales como (venta, producto, cantidad, uid, motivo)', async () => {
    await devolucionService.procesar(VENTA_ID, PRODUCTO_ID, 1, 'Cliente arrepentido', USER_ID);

    expect(sequelize.query).toHaveBeenCalledTimes(1);
    const [sql, opts] = sequelize.query.mock.calls[0];
    expect(sql).toMatch(/procesar_devolucion/);

    // Reconstruye el orden posicional que PG vera: el SQL usa
    // :venta,:producto,:cantidad,:cuarto,:quinto — el 4to debe ser uid y el 5to motivo.
    const positional = sql
      .split('procesar_devolucion(')[1]
      .split(')')[0]
      .split(',')
      .map((s) => s.trim().replace(/^:/, ''));
    expect(positional).toEqual(['venta', 'producto', 'cantidad', 'uid', 'motivo']);

    // Y los replacements deben mapear uid->userId y motivo->motivo (no cruzados).
    expect(opts.replacements.venta).toBe(VENTA_ID);
    expect(opts.replacements.producto).toBe(PRODUCTO_ID);
    expect(opts.replacements.cantidad).toBe(1);
    expect(opts.replacements.uid).toBe(USER_ID);
    expect(opts.replacements.motivo).toBe('Cliente arrepentido');
  });

  test('retorna el id de devolucion que devuelve PG', async () => {
    sequelize.query.mockResolvedValueOnce([[{ result: 'dev-123' }]]);
    const out = await devolucionService.procesar(VENTA_ID, PRODUCTO_ID, 2, 'Producto fallado', USER_ID);
    expect(out).toBe('dev-123');
  });
});
