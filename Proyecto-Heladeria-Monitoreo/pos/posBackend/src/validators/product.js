const { z } = require('zod');

const createProductSchema = z.object({
  categoria_id: z.string().uuid().nullable().optional(),
  nombre: z.string().trim().min(1, 'nombre requerido').max(100),
  precio: z.number().positive('precio debe ser > 0'),
  imagen_url: z.string().trim().max(500).nullable().optional(),
  stock: z.number().min(0).optional().default(0),
  stock_minimo: z.number().min(0).nullable().optional(),
  estado: z.enum(['activo', 'inactivo']).optional().default('activo'),
});

// Para updates parciales: todos opcionales pero con mismas reglas de sanitización
const updateProductSchema = z.object({
  categoria_id: z.string().uuid().nullable().optional(),
  nombre: z.string().trim().min(1).max(100).optional(),
  precio: z.number().positive().optional(),
  imagen_url: z.string().trim().max(500).nullable().optional(),
  stock: z.number().min(0).optional(),
  stock_minimo: z.number().min(0).nullable().optional(),
  estado: z.enum(['activo', 'inactivo']).optional(),
}).refine((data) => Object.keys(data).length > 0, { message: 'al menos un campo requerido' });

// Alias exigido por TDD del plan: productSchema.parse({nombre:'', precio:-5}) debe throw
const productSchema = createProductSchema;

module.exports = { productSchema, createProductSchema, updateProductSchema };
