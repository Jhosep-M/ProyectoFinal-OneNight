const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('Task1 recetaService', () => {
  it('expone descontar y reintegrar', () => {
    const svc = require('../src/services/recetaService');
    assert.equal(typeof svc.descontarInsumosReceta, 'function');
    assert.equal(typeof svc.reintegrarInsumosReceta, 'function');
  });

  it('calcula requerimientos proporcionales (puro)', () => {
    const { calculaRequerimientos } = require('../src/services/recetaService');
    const out = calculaRequerimientos(
      [{ insumo_id: 'a', cantidad_requerida: 100 }, { insumo_id: 'b', cantidad_requerida: 1 }],
      2
    );
    assert.deepEqual(out, [{ insumo_id: 'a', cantidad: 200 }, { insumo_id: 'b', cantidad: 2 }]);
  });

  it('rechaza cantidad invalida', async () => {
    const { descontarInsumosReceta } = require('../src/services/recetaService');
    await assert.rejects(() => descontarInsumosReceta('x', 0, {}), /cantidad/i);
    await assert.rejects(() => descontarInsumosReceta('x', -1, {}), /cantidad/i);
  });

  it('exige usuarioId del JWT (movimiento.usuario_id NOT NULL)', async () => {
    const { descontarInsumosReceta, reintegrarInsumosReceta } = require('../src/services/recetaService');
    await assert.rejects(() => descontarInsumosReceta('x', 1, {}), /usuarioId/i);
    await assert.rejects(() => reintegrarInsumosReceta('x', 1, {}), /usuarioId/i);
  });
});
