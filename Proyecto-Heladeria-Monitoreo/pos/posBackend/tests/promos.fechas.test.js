<<<<<<< HEAD
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
=======
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('Task8 promos validacion y stock_bajo', () => {
  it('rechaza % >100 y fin < inicio', () => {
    const { createPromoSchema } = require('../src/routes/promotions');
    assert.throws(() => createPromoSchema.parse({ nombre: 'X', porcentaje_descuento: 150 }));
    assert.throws(() => createPromoSchema.parse({
      nombre: 'X', porcentaje_descuento: 10,
      fecha_inicio: new Date('2026-02-01'), fecha_fin: new Date('2026-01-01'),
    }), /fecha_fin/);
    const ok = createPromoSchema.parse({ nombre: 'X', porcentaje_descuento: 10 });
    assert.equal(ok.estado, 'activa');
  });

  it('stock_bajo en el borde', () => {
    const { isStockBajo } = require('../src/services/productoService');
    assert.equal(isStockBajo({ stock: 5, stock_minimo: 5 }), true);
    assert.equal(isStockBajo({ stock: 6, stock_minimo: 5 }), false);
>>>>>>> origin/feature/Airton-auxilio
  });
});
