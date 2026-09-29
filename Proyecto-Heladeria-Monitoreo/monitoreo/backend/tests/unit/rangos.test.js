require('../helpers/env');
const { test } = require('node:test');
const assert = require('node:assert');

const { haySolapeRangos, haySolapePeriodos } = require('../../src/services/umbrales.service');

test('Review #4: umbrales contiguos NO solapan (semiantervalos [inf, sup))', () => {
  const existentes = [
    { limite_inferior: 0, limite_superior: 1000 },
    { limite_inferior: 1000, limite_superior: 1500 },
    { limite_inferior: 1500, limite_superior: 999999999 },
  ];
  assert.strictEqual(haySolapeRangos(0, 1000, existentes.slice(1)), false);
  assert.strictEqual(haySolapeRangos(1500, 2000, existentes.slice(0, 2)), false);
});

test('Review #4: umbrales que se cruzan SÍ solapan', () => {
  const existentes = [{ limite_inferior: 1000, limite_superior: 1500 }];
  assert.strictEqual(haySolapeRangos(900, 1100, existentes), true);
  assert.strictEqual(haySolapeRangos(1200, 1300, existentes), true, 'anidado');
  assert.strictEqual(haySolapeRangos(1400, 9000, existentes), true, 'extiende hacia arriba');
  assert.strictEqual(haySolapeRangos(0, 100000, existentes), true, 'engloba');
});

test('Review #4: tocar el borde exacto no cuenta como solape', () => {
  const existentes = [{ limite_inferior: 1000, limite_superior: 1500 }];
  assert.strictEqual(haySolapeRangos(1500, 2000, existentes), false, 'empieza donde termina');
  assert.strictEqual(haySolapeRangos(500, 1000, existentes), false, 'termina donde empieza');
});

test('períodos de tarifa: solapan por día compartido, contiguos no', () => {
  const enero = { fecha_inicio: '2026-01-01', fecha_fin: '2026-01-31' };
  assert.strictEqual(haySolapePeriodos('2026-01-15', '2026-02-15', [enero]), true, 'comparte días de enero');
  assert.strictEqual(haySolapePeriodos('2026-02-01', '2026-02-28', [enero]), false, 'contiguo');
  assert.strictEqual(haySolapePeriodos('2025-12-01', '2026-01-01', [enero]), true, 'comparte el día 1/1 (cerrado)');
  assert.strictEqual(haySolapePeriodos('2025-12-01', '2025-12-31', [enero]), false);
});

test('sin existentes → nunca solapa', () => {
  assert.strictEqual(haySolapeRangos(0, 10, []), false);
  assert.strictEqual(haySolapePeriodos('2026-01-01', '2026-01-31', []), false);
});
