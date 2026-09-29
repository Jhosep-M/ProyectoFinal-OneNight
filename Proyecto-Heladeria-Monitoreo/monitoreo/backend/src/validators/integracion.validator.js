const { z } = require('zod');

const consumptionSchema = z.object({
  consumoExternoId: z.string().uuid(),
  idempotencyKey: z.string().trim().min(8).max(150).optional(),
  tipoRecurso: z.enum(['agua', 'energia']),
  cantidad: z.number().positive()
    .refine((v) => Math.abs(v * 1000 - Math.round(v * 1000)) < 1e-9, { message: 'máximo 3 decimales' }),
  unidadMedida: z.string().trim().min(1).max(20),
  fechaConsumo: z.coerce.date(),
  origen: z.string().trim().min(1).max(30).default('POS'),
  organizacionExternaId: z.string().uuid(),
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
