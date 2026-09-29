const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('Task4 puntos', () => {
  it('calcula puntos floor(total/10) y expone acumular', () => {
    const { calculaPuntos, acumularPuntos } = require('../src/services/puntosService');
    assert.equal(calculaPuntos(125.5), 12);
    assert.equal(calculaPuntos(9.99), 0);
    assert.equal(typeof acumularPuntos, 'function');
  });
});
