const { z } = require('zod');

const umbralSchema = z.object({
  organizacionId: z.string().uuid(),
  tipoRecursoId: z.string().uuid(),
  nombre: z.string().trim().min(1).max(120),
  nivel: z.enum(['normal', 'alerta', 'critico']),
  limiteInferior: z.number().min(0),
  limiteSuperior: z.number().positive(),
}).refine((v) => v.limiteInferior < v.limiteSuperior, {
  message: 'limiteInferior debe ser menor que limiteSuperior', path: ['limiteSuperior'],
});

const umbralUpdateSchema = z.object({
  nombre: z.string().trim().min(1).max(120).optional(),
  nivel: z.enum(['normal', 'alerta', 'critico']).optional(),
  limiteInferior: z.number().min(0).optional(),
  limiteSuperior: z.number().positive().optional(),
  estado: z.enum(['activo', 'inactivo']).optional(),
}).refine((v) => Object.keys(v).length > 0, { message: 'sin cambios' });

module.exports = { umbralSchema, umbralUpdateSchema };
