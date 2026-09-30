const { createPromoSchema } = require('../src/routes/promotions');
const { isStockBajo } = require('../src/services/productoService');

describe('Task8 promos validacion y stock_bajo', () => {
  it('rechaza % >100 y fin < inicio', () => {
    expect(() => createPromoSchema.parse({ nombre: 'X', porcentaje_descuento: 150 })).toThrow();
    expect(() => createPromoSchema.parse({
      nombre: 'X', porcentaje_descuento: 10,
      fecha_inicio: new Date('2026-02-01'), fecha_fin: new Date('2026-01-01'),
    })).toThrow(/fecha_fin/);
    const ok = createPromoSchema.parse({ nombre: 'X', porcentaje_descuento: 10 });
    expect(ok.estado).toBe('activa');
  });

  it('stock_bajo en el borde', () => {
    expect(isStockBajo({ stock: 5, stock_minimo: 5 })).toBe(true);
    expect(isStockBajo({ stock: 6, stock_minimo: 5 })).toBe(false);
  });
});
