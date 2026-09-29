const { z } = require('zod');

const recomendacionSchema = z.object({
  organizacionId: z.string().uuid(),
  titulo: z.string().trim().min(3).max(160),
  descripcion: z.string().trim().min(3).max(2000),
  prioridad: z.enum(['baja', 'media', 'alta']).default('media'),
});

const recomendacionUpdateSchema = z.object({
  titulo: z.string().trim().min(3).max(160).optional(),
  descripcion: z.string().trim().min(3).max(2000).optional(),
  prioridad: z.enum(['baja', 'media', 'alta']).optional(),
  estado: z.enum(['abierta', 'aplicada', 'descartada']).optional(),
}).refine((v) => Object.keys(v).length > 0, { message: 'sin cambios' });

module.exports = { recomendacionSchema, recomendacionUpdateSchema };
