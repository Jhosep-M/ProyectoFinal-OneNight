const { z } = require('zod');

const consumptionSchema = z.object({
  consumoExternoId: z.string().uuid(),
<<<<<<< HEAD
  idempotencyKey: z.string().trim().min(8).max(120),
=======
  idempotencyKey: z.string().trim().min(8).max(150).optional(),
>>>>>>> origin/feature/Airton-auxilio
  tipoRecurso: z.enum(['agua', 'energia']),
  cantidad: z.number().positive()
    .refine((v) => Math.abs(v * 1000 - Math.round(v * 1000)) < 1e-9, { message: 'máximo 3 decimales' }),
  unidadMedida: z.string().trim().min(1).max(20),
  fechaConsumo: z.coerce.date(),
  origen: z.string().trim().min(1).max(30).default('POS'),
<<<<<<< HEAD
  // En el contrato AGENTS.md §6; el worker real del POS hoy NO lo envía → opcional.
  organizacionExternaId: z.string().uuid().optional(),
=======
  organizacionExternaId: z.string().uuid(),
>>>>>>> origin/feature/Airton-auxilio
});

module.exports = { consumptionSchema };

<<<<<<< HEAD
// CRUD de integraciones (Task 10): la API key plaintext jamás viaja en estos
// schemas — solo se genera en el service y sale en la respuesta crear/rotar.
=======
>>>>>>> origin/feature/Airton-auxilio
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
