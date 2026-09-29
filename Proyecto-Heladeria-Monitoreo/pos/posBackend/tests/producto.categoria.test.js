const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { createProductSchema, updateProductSchema } = require('../src/validators/product');

describe('Step1 producto - validacion existente', () => {
  it('rechaza nombre vacio y precio negativo', () => {
    assert.throws(() => createProductSchema.parse({ nombre: '', precio: -5 }));
  });

  it('update parcial exige al menos un campo', () => {
    assert.throws(() => updateProductSchema.parse({}));
  });

  it('acepta producto valido con stock_minimo', () => {
    const p = createProductSchema.parse({ nombre: 'Helado Vainilla', precio: 12.5, stock: 10, stock_minimo: 2 });
    assert.equal(p.nombre, 'Helado Vainilla');
    assert.equal(p.stock_minimo, 2);
  });
});

describe('Step1 categoria - schemas nuevos', () => {
  it('crea categoria valida y rechaza nombre vacio', () => {
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
  });
});

describe('Step1 reglas inactivar (no delete fisico)', () => {
  it('bloquea inactivar producto con ventas', () => {
    const { canInactivateProduct } = require('../src/services/productoService');
    assert.equal(canInactivateProduct({ detalleCount: 2 }), false);
    assert.equal(canInactivateProduct({ detalleCount: 0 }), true);
  });

  it('bloquea inactivar categoria con productos', () => {
    const { canInactivateCategory } = require('../src/services/productoService');
    assert.equal(canInactivateCategory({ productCount: 1 }), false);
    assert.equal(canInactivateCategory({ productCount: 0 }), true);
  });
});
