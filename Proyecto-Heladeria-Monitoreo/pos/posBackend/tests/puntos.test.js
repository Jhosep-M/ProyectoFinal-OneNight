const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('Task4 puntos', () => {
  it('calcula puntos floor(total/30) y expone acumular', () => {
    const { calculaPuntos, acumularPuntos } = require('../src/services/puntosService');
    assert.equal(calculaPuntos(125.5), 4);
    assert.equal(calculaPuntos(90), 3);
    assert.equal(calculaPuntos(29.99), 0);
    assert.equal(calculaPuntos(30), 1);
    assert.equal(typeof acumularPuntos, 'function');
  });
});
