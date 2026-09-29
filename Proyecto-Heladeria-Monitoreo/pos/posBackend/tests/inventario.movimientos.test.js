const { aplicaMovimiento } = require('../src/services/inventarioService');

describe('Task2 movimientos con stock', () => {
  it('ingreso suma, salida resta, ajuste fija', () => {
    expect(aplicaMovimiento({ stock: 10, tipo: 'ingreso', cantidad: 50 })).toBe(60);
    expect(aplicaMovimiento({ stock: 10, tipo: 'salida', cantidad: 4 })).toBe(6);
    expect(aplicaMovimiento({ stock: 10, tipo: 'ajuste', cantidad: 7 })).toBe(7);
  });

  it('salida que deja negativo lanza STOCK_NEGATIVO', () => {
    expect(() => aplicaMovimiento({ stock: 5, tipo: 'salida', cantidad: 10 })).toThrow(/STOCK_NEGATIVO/);
  });

  it('rechaza tipo y cantidad invalidos', () => {
    expect(() => aplicaMovimiento({ stock: 5, tipo: 'x', cantidad: 1 })).toThrow(/tipo/i);
    expect(() => aplicaMovimiento({ stock: 5, tipo: 'ingreso', cantidad: 0 })).toThrow(/cantidad/i);
  });
});
