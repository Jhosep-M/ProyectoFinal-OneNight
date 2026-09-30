const { z } = require('zod');

const consumptionSchema = z.object({
  consumoExternoId: z.string().uuid(),
  idempotencyKey: z.string().trim().min(8).max(150).optional(),
  tipoRecurso: z.enum(['agua', 'energia']),
  // Contrato shared/contracts/pos-to-monitoring/consumption.schema.json:
  // cantidad minimum 0 (el 0 es legítimo: turno sin equipos activos) y sin
  // tope de decimales. La BD guarda NUMERIC(14,3): el service redondea a 3.
  cantidad: z.number().nonnegative(),
  unidadMedida: z.enum(['litros', 'kWh']),
  fechaConsumo: z.coerce.date(),
  origen: z.string().trim().min(1).max(30).default('POS'),
  organizacionExternaId: z.string().uuid().optional(),
});

module.exports = { consumptionSchema };

const integracionCrearSchema = z.object({
  organizacionId: z.string().uuid(),
  nombre: z.string().trim().min(1).max(120),
});

const integracionActualizarSchema = z.union([
  z.object({ accion: z.literal('rotar') }),
  z.object({ estado: z.enum(['activo', 'inactivo']) }),
]);

module.exports.integracionCrearSchema = integracionCrearSchema;
module.exports.integracionActualizarSchema = integracionActualizarSchema;
