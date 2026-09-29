const { z } = require('zod');

const createCategorySchema = z.object({
  nombre: z.string().trim().min(1, 'nombre requerido').max(100),
  estado: z.enum(['activo', 'inactivo']).optional().default('activo'),
});

const updateCategorySchema = z.object({
  nombre: z.string().trim().min(1).max(100).optional(),
  estado: z.enum(['activo', 'inactivo']).optional(),
}).refine((data) => Object.keys(data).length > 0, { message: 'al menos un campo requerido' });

const categorySchema = createCategorySchema;

module.exports = { categorySchema, createCategorySchema, updateCategorySchema };
