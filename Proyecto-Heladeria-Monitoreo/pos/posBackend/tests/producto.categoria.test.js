<<<<<<< HEAD
const { createProductSchema, updateProductSchema } = require('../src/validators/product');
const { createCategorySchema, updateCategorySchema } = require('../src/validators/category');
const { canInactivateProduct, canInactivateCategory } = require('../src/services/productoService');

describe('Step1 producto - validacion existente', () => {
  it('rechaza nombre vacio y precio negativo', () => {
    expect(() => createProductSchema.parse({ nombre: '', precio: -5 })).toThrow();
  });

  it('update parcial exige al menos un campo', () => {
    expect(() => updateProductSchema.parse({})).toThrow();
=======
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { createProductSchema, updateProductSchema } = require('../src/validators/product');

describe('Step1 producto - validacion existente', () => {
  it('rechaza nombre vacio y precio negativo', () => {
    assert.throws(() => createProductSchema.parse({ nombre: '', precio: -5 }));
  });

  it('update parcial exige al menos un campo', () => {
    assert.throws(() => updateProductSchema.parse({}));
>>>>>>> origin/feature/Airton-auxilio
  });

  it('acepta producto valido con stock_minimo', () => {
    const p = createProductSchema.parse({ nombre: 'Helado Vainilla', precio: 12.5, stock: 10, stock_minimo: 2 });
<<<<<<< HEAD
    expect(p.nombre).toBe('Helado Vainilla');
    expect(p.stock_minimo).toBe(2);
=======
    assert.equal(p.nombre, 'Helado Vainilla');
    assert.equal(p.stock_minimo, 2);
>>>>>>> origin/feature/Airton-auxilio
  });
});

describe('Step1 categoria - schemas nuevos', () => {
  it('crea categoria valida y rechaza nombre vacio', () => {
<<<<<<< HEAD
    const c = createCategorySchema.parse({ nombre: 'Helados' });
    expect(c.nombre).toBe('Helados');
    expect(() => createCategorySchema.parse({ nombre: '' })).toThrow();
  });

  it('update categoria parcial exige al menos un campo', () => {
    expect(() => updateCategorySchema.parse({})).toThrow();
    const ok = updateCategorySchema.parse({ estado: 'inactivo' });
    expect(ok.estado).toBe('inactivo');
=======
    const { createCategorySchema } = require('../src/validators/category');
    const c = createCategorySchema.parse({ nombre: 'Helados' });
    assert.equal(c.nombre, 'Helados');
    assert.throws(() => createCategorySchema.parse({ nombre: '' }));
  });

  it('update categoria parcial exige al menos un campo', () => {
    const { updateCategorySchema } = require('../src/validators/category');
    assert.throws(() => updateCategorySchema.parse({}));
    const ok = updateCategorySchema.parse({ estado: 'inactivo' });
    assert.equal(ok.estado, 'inactivo');
>>>>>>> origin/feature/Airton-auxilio
  });
});

describe('Step1 reglas inactivar (no delete fisico)', () => {
  it('bloquea inactivar producto con ventas', () => {
<<<<<<< HEAD
    expect(canInactivateProduct({ detalleCount: 2 })).toBe(false);
    expect(canInactivateProduct({ detalleCount: 0 })).toBe(true);
  });

  it('bloquea inactivar categoria con productos', () => {
    expect(canInactivateCategory({ productCount: 1 })).toBe(false);
    expect(canInactivateCategory({ productCount: 0 })).toBe(true);
=======
    const { canInactivateProduct } = require('../src/services/productoService');
    assert.equal(canInactivateProduct({ detalleCount: 2 }), false);
    assert.equal(canInactivateProduct({ detalleCount: 0 }), true);
  });

  it('bloquea inactivar categoria con productos', () => {
    const { canInactivateCategory } = require('../src/services/productoService');
    assert.equal(canInactivateCategory({ productCount: 1 }), false);
    assert.equal(canInactivateCategory({ productCount: 0 }), true);
>>>>>>> origin/feature/Airton-auxilio
  });
});
