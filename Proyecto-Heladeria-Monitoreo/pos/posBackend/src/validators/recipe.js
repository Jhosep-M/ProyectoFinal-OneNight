const { z } = require('zod');

const createRecipeSchema = z.object({
  producto_id: z.string().uuid(),
  insumo_id: z.string().uuid(),
  cantidad_requerida: z.number().positive('cantidad_requerida debe ser > 0'),
});

const updateRecipeSchema = z.object({
  cantidad_requerida: z.number().positive('cantidad_requerida debe ser > 0').optional(),
}).refine((d) => Object.keys(d).length > 0, { message: 'al menos un campo requerido' });

const uuidParamSchema = z.string().uuid();

const listRecipeQuerySchema = z.object({
  producto_id: z.string().uuid().optional(),
});

module.exports = { createRecipeSchema, updateRecipeSchema, uuidParamSchema, listRecipeQuerySchema };
