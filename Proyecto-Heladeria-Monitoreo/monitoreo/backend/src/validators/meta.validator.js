const { z } = require('zod');

const metaSchema = z.object({
  organizacionId: z.string().uuid(),
  tipoRecursoId: z.string().uuid(),
  nombre: z.string().trim().min(1).max(120),
  porcentajeReduccion: z.number().min(0).max(100),
  fechaInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fechaFin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}).refine((v) => v.fechaInicio < v.fechaFin, {
  message: 'fechaInicio debe ser anterior a fechaFin', path: ['fechaFin'],
});

const metaUpdateSchema = z.object({
  nombre: z.string().trim().min(1).max(120).optional(),
  porcentajeReduccion: z.number().min(0).max(100).optional(),
  fechaInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  fechaFin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  estado: z.enum(['activo', 'inactivo', 'cumplida', 'incumplida']).optional(),
}).refine((v) => Object.keys(v).length > 0, { message: 'sin cambios' });

module.exports = { metaSchema, metaUpdateSchema };
