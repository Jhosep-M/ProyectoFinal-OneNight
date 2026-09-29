const { z } = require('zod');

const createMesaSchema = z.object({
  numero: z.number().int().positive('numero debe ser entero > 0').optional(),
  nombre: z.union([z.number().int().positive(), z.string().trim().min(1).max(10)]).optional(),
}).refine((d) => d.numero !== undefined || d.nombre !== undefined, { message: 'numero requerido' });

const updateMesaSchema = z.object({
  estado: z.enum(['libre', 'ocupada', 'reservada'], { errorMap: () => ({ message: 'estado debe ser libre, ocupada o reservada' }) }),
});

module.exports = { createMesaSchema, updateMesaSchema };
