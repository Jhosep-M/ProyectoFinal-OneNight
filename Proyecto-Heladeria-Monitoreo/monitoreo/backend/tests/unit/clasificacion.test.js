require('../helpers/env');
const { test } = require('node:test');
const assert = require('node:assert');

const { clasificar } = require('../../src/services/clasificacion.service');

const bandas = [
  { id: 'u1', nivel: 'normal', limite_inferior: 0, limite_superior: 1000 },
  { id: 'u2', nivel: 'alerta', limite_inferior: 1000, limite_superior: 1500 },
  { id: 'u3', nivel: 'critico', limite_inferior: 1500, limite_superior: 999999999 },
];

test('Review #4: dentro de cada banda devuelve el nivel correcto', () => {
  assert.deepStrictEqual(clasificar(500, bandas), { nivel: 'normal', umbralId: 'u1' });
  assert.deepStrictEqual(clasificar(1200, bandas), { nivel: 'alerta', umbralId: 'u2' });
  assert.deepStrictEqual(clasificar(3000, bandas), { nivel: 'critico', umbralId: 'u3' });
});

test('Review #4: frontera inferior INCLUSIVA (cantidad == limite_inferior cae en la banda)', () => {
  assert.deepStrictEqual(clasificar(1000, bandas), { nivel: 'alerta', umbralId: 'u2' });
  assert.deepStrictEqual(clasificar(1500, bandas), { nivel: 'critico', umbralId: 'u3' });
  assert.deepStrictEqual(clasificar(0, bandas), { nivel: 'normal', umbralId: 'u1' });
});

test('Review #4: frontera superior EXCLUSIVA (cantidad == limite_superior va a la siguiente banda)', () => {
  assert.deepStrictEqual(clasificar(999.999, bandas), { nivel: 'normal', umbralId: 'u1' });
  // 1500 es inclusive abajo de critico; verificar el corte justo antes:
  assert.deepStrictEqual(clasificar(1499.999, bandas), { nivel: 'alerta', umbralId: 'u2' });
});

test('Review #4: sin_umbral cuando la cantidad queda fuera de todo rango (sin alerta falsa)', () => {
  const acotadas = [
    { id: 'u1', nivel: 'normal', limite_inferior: 0, limite_superior: 100 },
    { id: 'u2', nivel: 'alerta', limite_inferior: 100, limite_superior: 200 },
  ];
  assert.deepStrictEqual(clasificar(500, acotadas), { nivel: 'sin_umbral', umbralId: null });
  assert.deepStrictEqual(clasificar(1200, []), { nivel: 'sin_umbral', umbralId: null }, 'sin umbrales definidos');
});

test('el orden de entrada no afecta el resultado (bandas desordenadas)', () => {
  const desordenadas = [bandas[2], bandas[0], bandas[1]];
  assert.deepStrictEqual(clasificar(1200, desordenadas), { nivel: 'alerta', umbralId: 'u2' });
  assert.deepStrictEqual(clasificar(0.5, desordenadas), { nivel: 'normal', umbralId: 'u1' });
});

test('acepta números como string (DECIMAL de Postgres llega como string)', () => {
  assert.deepStrictEqual(clasificar('1200', bandas), { nivel: 'alerta', umbralId: 'u2' });
});
