const { z } = require('zod');

const medidorSchema = z.object({
  organizacionId: z.string().uuid(),
  tipoRecursoId: z.string().uuid(),
  codigoMedidor: z.string().trim().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{2,59}$/, 'formato inválido'),
  nombre: z.string().trim().min(1).max(120),
});

const medidorUpdateSchema = z.object({
  nombre: z.string().trim().min(1).max(120).optional(),
  estado: z.enum(['activo', 'inactivo']).optional(),
<<<<<<< HEAD
=======
  codigoMedidor: z.string().trim().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{2,59}$/, 'formato inválido').optional(),
>>>>>>> origin/feature/Airton-auxilio
}).refine((v) => Object.keys(v).length > 0, { message: 'sin cambios' });

module.exports = { medidorSchema, medidorUpdateSchema };
