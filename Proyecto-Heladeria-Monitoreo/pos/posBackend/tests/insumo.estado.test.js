const { createInsumoSchema, updateInsumoSchema } = require('../src/validators/inventory');

describe('Task6 insumo.estado unificado con live', () => {
  it('acepta disponible/no_disponible/vencido/inactivo y defaultea disponible', () => {
    const d = createInsumoSchema.parse({ nombre: 'Base', unidad_medida: 'g' });
    expect(d.estado).toBe('disponible');
    for (const e of ['disponible', 'no_disponible', 'vencido', 'inactivo']) {
      expect(createInsumoSchema.parse({ nombre: 'X', unidad_medida: 'g', estado: e }).estado).toBe(e);
    }
    expect(() => createInsumoSchema.parse({ nombre: 'X', unidad_medida: 'g', estado: 'activo' })).toThrow();
  });

  it('update acepta enum live', () => {
    expect(updateInsumoSchema.parse({ estado: 'vencido' }).estado).toBe('vencido');
    expect(() => updateInsumoSchema.parse({ estado: 'activo' })).toThrow();
  });
});
