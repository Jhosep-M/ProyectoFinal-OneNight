const { createProductSchema, updateProductSchema } = require('../src/validators/product');
const { createCategorySchema, updateCategorySchema } = require('../src/validators/category');
const { canInactivateProduct, canInactivateCategory } = require('../src/services/productoService');

describe('Step1 producto - validacion existente', () => {
  it('rechaza nombre vacio y precio negativo', () => {
    expect(() => createProductSchema.parse({ nombre: '', precio: -5 })).toThrow();
  });

  it('update parcial exige al menos un campo', () => {
    expect(() => updateProductSchema.parse({})).toThrow();
  });

  it('acepta producto valido con stock_minimo', () => {
    const p = createProductSchema.parse({ nombre: 'Helado Vainilla', precio: 12.5, stock: 10, stock_minimo: 2 });
    expect(p.nombre).toBe('Helado Vainilla');
    expect(p.stock_minimo).toBe(2);
  });
});

describe('Step1 categoria - schemas nuevos', () => {
  it('crea categoria valida y rechaza nombre vacio', () => {
    const c = createCategorySchema.parse({ nombre: 'Helados' });
    expect(c.nombre).toBe('Helados');
    expect(() => createCategorySchema.parse({ nombre: '' })).toThrow();
  });

  it('update categoria parcial exige al menos un campo', () => {
    expect(() => updateCategorySchema.parse({})).toThrow();
    const ok = updateCategorySchema.parse({ estado: 'inactivo' });
    expect(ok.estado).toBe('inactivo');
  });
});

describe('Step1 reglas inactivar (no delete fisico)', () => {
  it('bloquea inactivar producto con ventas', () => {
    expect(canInactivateProduct({ detalleCount: 2 })).toBe(false);
    expect(canInactivateProduct({ detalleCount: 0 })).toBe(true);
  });

  it('bloquea inactivar categoria con productos', () => {
    expect(canInactivateCategory({ productCount: 1 })).toBe(false);
    expect(canInactivateCategory({ productCount: 0 })).toBe(true);
  });
});
