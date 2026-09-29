require('../helpers/env');
const { test } = require('node:test');
const assert = require('node:assert');

const payloadRealDelPOS = {
  consumoExternoId: '9aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  idempotencyKey: '4f0c1a2e-7d3b-4f8a-9c2d-1b6e5a7f8c9d',
  tipoRecurso: 'agua',
  cantidad: 125.5,
  unidadMedida: 'litros',
  fechaConsumo: '2026-09-21T18:00:00',
  organizacionExternaId: '11111111-1111-4111-8111-111111111111',
  origen: 'POS',
};

test('consumptionSchema acepta el payload literal que envía el POS', () => {
  const { consumptionSchema } = require('../../src/validators/integracion.validator');
  const r = consumptionSchema.safeParse(payloadRealDelPOS);
  assert.strictEqual(r.success, true, JSON.stringify(!r.success && r.error.issues));
  assert.strictEqual(r.data.tipoRecurso, 'agua');
  assert.strictEqual(r.data.origen, 'POS');
});

test('consumptionSchema acepta el payload del contrato AGENTS.md con organizacionExternaId', () => {
  const { consumptionSchema } = require('../../src/validators/integracion.validator');
  const r = consumptionSchema.safeParse({
    ...payloadRealDelPOS,
    organizacionExternaId: '11111111-1111-4111-8111-111111111111',
  });
  assert.strictEqual(r.success, true);
});

test('consumptionSchema rechaza tipos de recurso desconocidos, cantidades inválidas y fechas basura', () => {
  const { consumptionSchema } = require('../../src/validators/integracion.validator');
  const casos = [
    { ...payloadRealDelPOS, tipoRecurso: 'gas' },
    { ...payloadRealDelPOS, cantidad: -1 },
    { ...payloadRealDelPOS, cantidad: 0 },
    { ...payloadRealDelPOS, cantidad: 1.2345 }, // NUMERIC(14,3): máx 3 decimales
    { ...payloadRealDelPOS, fechaConsumo: 'ayer' },
    { ...payloadRealDelPOS, idempotencyKey: '' },
    { ...payloadRealDelPOS, consumoExternoId: 'no-es-uuid' },
    { ...payloadRealDelPOS, unidadMedida: 'x'.repeat(21) },
  ];
  for (const c of casos) {
    assert.strictEqual(consumptionSchema.safeParse(c).success, false, `debía rechazar: ${JSON.stringify(c)}`);
  }
});

test('consumptionSchema hace strip de campos desconocidos inyectados', () => {
  const { consumptionSchema } = require('../../src/validators/integracion.validator');
  const r = consumptionSchema.safeParse({ ...payloadRealDelPOS, estado: 'procesado', rol_id: 'x' });
  assert.strictEqual(r.success, true);
  assert.strictEqual(r.data.estado, undefined, 'campos extra eliminados');
  assert.strictEqual(r.data.rol_id, undefined);
});

test('si shared/contracts está lleno, el required del contrato ⊆ campos que aceptamos', async () => {
  const fs = require('fs');
  const path = require('path');
  const archivo = path.join(__dirname, '..', '..', '..', '..', 'shared', 'contracts', 'pos-to-monitoring', 'consumption.schema.json');
  if (!fs.existsSync(archivo)) {
    // Contrato aún no publicado por P4 → este test queda verde y se activa solo.
    return;
  }
  const contenido = fs.readFileSync(archivo, 'utf8').trim();
  if (!contenido) {
    // Contrato aún no congelado por P4 → este test queda verde y se activa solo.
    return;
  }
  const esquema = JSON.parse(contenido);
  const requeridos = esquema.required || [];
  const { consumptionSchema } = require('../../src/validators/integracion.validator');
  // Muestreamos: construimos un objeto mínimo válido con los required del contrato
  // y verificamos que nuestro validador no lo rechace por campos desconocidos/ausentes.
  const plantilla = {
    consumoExternoId: '9aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    idempotencyKey: '4f0c1a2e-7d3b-4f8a-9c2d-1b6e5a7f8c9d',
    tipoRecurso: 'agua', cantidad: 10, unidadMedida: 'litros',
    fechaConsumo: '2026-09-21T18:00:00', origen: 'POS',
    organizacionExternaId: '11111111-1111-4111-8111-111111111111',
  };
  const muestra = Object.fromEntries(requeridos.map((k) => [k, plantilla[k]]));
  const faltantes = requeridos.filter((k) => plantilla[k] === undefined);
  assert.strictEqual(faltantes.length, 0, `el contrato exige campos que no manejamos: ${faltantes}`);
  assert.strictEqual(consumptionSchema.safeParse(muestra).success, true);
});
