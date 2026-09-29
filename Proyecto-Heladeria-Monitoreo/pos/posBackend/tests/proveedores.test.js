const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('Task3 proveedores', () => {
  it('valida crear y rechaza nombre vacio', () => {
    const { createSupplierSchema } = require('../src/validators/supplier');
    const s = createSupplierSchema.parse({ nombre: 'Lacteos SA', nit: '123' });
    assert.equal(s.nombre, 'Lacteos SA');
    assert.throws(() => createSupplierSchema.parse({ nombre: '' }));
  });

  it('update parcial exige un campo y valida correo', () => {
    const { updateSupplierSchema } = require('../src/validators/supplier');
    assert.throws(() => updateSupplierSchema.parse({}));
    assert.throws(() => updateSupplierSchema.parse({ correo: 'no-es-correo' }));
    assert.equal(updateSupplierSchema.parse({ estado: 'inactivo' }).estado, 'inactivo');
  });

  it('router expone CRUD', () => {
    const { suppliersRouter } = require('../src/routes/suppliers');
    assert.ok(suppliersRouter, 'router existe');
    const layers = suppliersRouter.stack.map((l) => l.route && `${Object.keys(l.route.methods)[0].toUpperCase()} ${l.route.path}`);
    for (const want of ['GET /', 'GET /:id', 'POST /', 'PATCH /:id', 'DELETE /:id']) {
      assert.ok(layers.includes(want), 'falta ' + want + ' en ' + layers.join(','));
    }
  });
});
