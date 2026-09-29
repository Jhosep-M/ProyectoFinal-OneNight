const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('ventaInventario adapter (interfaz P1)', () => {
  it('expone aplicarVenta, revertirAnulacion y aplicarDevolucion', () => {
    const a = require('../src/services/ventaInventario');
    assert.equal(typeof a.aplicarVentaAInventario, 'function');
    assert.equal(typeof a.revertirAnulacionAInventario, 'function');
    assert.equal(typeof a.aplicarDevolucionAInventario, 'function');
  });

  it('valida entradas sin tocar DB', async () => {
    const a = require('../src/services/ventaInventario');
    await assert.rejects(() => a.aplicarVentaAInventario({}), /productoId/i);
    await assert.rejects(() => a.aplicarVentaAInventario({ productoId: 'x', cantidad: 0, usuarioId: 'u' }), /cantidad/i);
    await assert.rejects(() => a.aplicarVentaAInventario({ productoId: 'x', cantidad: 1 }), /usuarioId/i);
    await assert.rejects(() => a.revertirAnulacionAInventario({ productoId: 'x', cantidad: 1 }), /usuarioId/i);
    await assert.rejects(() => a.aplicarDevolucionAInventario({ productoId: 'x', cantidad: 1 }), /usuarioId/i);
  });
});
