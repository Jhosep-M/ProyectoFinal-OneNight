'use strict';

describe('Task4 puntos', () => {
  test('calcula puntos floor(total/30) y expone acumular', () => {
    const { calculaPuntos, acumularPuntos } = require('../src/services/puntosService');
    expect(calculaPuntos(125.5)).toBe(4);
    expect(calculaPuntos(90)).toBe(3);
    expect(calculaPuntos(29.99)).toBe(0);
    expect(calculaPuntos(30)).toBe(1);
    expect(typeof acumularPuntos).toBe('function');
  });
});
