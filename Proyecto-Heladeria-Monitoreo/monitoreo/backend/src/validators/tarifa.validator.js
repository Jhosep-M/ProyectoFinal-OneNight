const { z } = require('zod');

const tarifaSchema = z.object({
  organizacionId: z.string().uuid().optional(), // ausente/omitida = tarifa global
  tipoRecursoId: z.string().uuid(),
  nombre: z.string().trim().min(1).max(120),
  monto: z.number().min(0),
  unidad: z.string().trim().min(1).max(20),
  fechaInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fechaFin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}).refine((v) => v.fechaInicio <= v.fechaFin, {
  message: 'fechaInicio debe ser <= fechaFin', path: ['fechaFin'],
});

const tarifaUpdateSchema = z.object({
  nombre: z.string().trim().min(1).max(120).optional(),
  monto: z.number().min(0).optional(),
  fechaInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  fechaFin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).refine((v) => Object.keys(v).length > 0, { message: 'sin cambios' });

module.exports = { tarifaSchema, tarifaUpdateSchema };
