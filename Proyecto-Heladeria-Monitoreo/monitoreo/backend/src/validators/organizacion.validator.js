const { z } = require('zod');

const organizacionSchema = z.object({
  nombre: z.string().trim().min(1).max(120),
  nit: z.string().trim().min(3).max(30).optional(),
});

const organizacionUpdateSchema = z.object({
  nombre: z.string().trim().min(1).max(120).optional(),
  estado: z.enum(['activo', 'inactivo']).optional(),
}).refine((v) => Object.keys(v).length > 0, { message: 'sin cambios' });

module.exports = { organizacionSchema, organizacionUpdateSchema };
