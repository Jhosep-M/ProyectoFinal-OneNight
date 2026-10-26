'use strict';

/* ventaInventario adapter (interfaz P1): expone aplicarVenta y revertirAnulacion.
 * Valida entradas sin tocar DB (checkBase sync-throw en
 * funcion async => promesa rechazada).
 */

describe('ventaInventario adapter (interfaz P1)', () => {
  test('expone aplicarVenta y revertirAnulacion', () => {
    const a = require('../src/services/ventaInventario');
    expect(typeof a.aplicarVentaAInventario).toBe('function');
    expect(typeof a.revertirAnulacionAInventario).toBe('function');
    expect(a.aplicarDevolucionAInventario).toBeUndefined();
  });

  test('valida entradas sin tocar DB', async () => {
    const a = require('../src/services/ventaInventario');
    await expect(a.aplicarVentaAInventario({})).rejects.toThrow(/productoId/i);
    await expect(a.aplicarVentaAInventario({ productoId: 'x', cantidad: 0, usuarioId: 'u' })).rejects.toThrow(/cantidad/i);
    await expect(a.aplicarVentaAInventario({ productoId: 'x', cantidad: 1 })).rejects.toThrow(/usuarioId/i);
    await expect(a.revertirAnulacionAInventario({ productoId: 'x', cantidad: 1 })).rejects.toThrow(/usuarioId/i);
  });
});
