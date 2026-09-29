const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { createInsumoSchema, updateInsumoSchema } = require('../src/validators/inventory');

describe('Task6 insumo.estado unificado con live', () => {
  it('acepta disponible/no_disponible/vencido/inactivo y defaultea disponible', () => {
    const d = createInsumoSchema.parse({ nombre: 'Base', unidad_medida: 'g' });
    assert.equal(d.estado, 'disponible');
    for (const e of ['disponible', 'no_disponible', 'vencido', 'inactivo']) {
      assert.equal(createInsumoSchema.parse({ nombre: 'X', unidad_medida: 'g', estado: e }).estado, e);
    }
    assert.throws(() => createInsumoSchema.parse({ nombre: 'X', unidad_medida: 'g', estado: 'activo' }));
  });

  it('update acepta enum live', () => {
    assert.equal(updateInsumoSchema.parse({ estado: 'vencido' }).estado, 'vencido');
    assert.throws(() => updateInsumoSchema.parse({ estado: 'activo' }));
  });
});
