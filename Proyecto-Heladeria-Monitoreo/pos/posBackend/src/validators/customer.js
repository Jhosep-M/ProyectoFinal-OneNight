const { z } = require('zod');
const createCustomerSchema = z.object({
  nombre: z.string().trim().min(1).max(100),
  telefono: z.string().trim().max(30).nullable().optional(),
  correo: z.string().trim().email().max(150).nullable().optional(),
  estado: z.enum(['activo','inactivo']).optional().default('activo'),
});
const updateCustomerSchema = z.object({
  nombre: z.string().trim().min(1).max(100).optional(),
  telefono: z.string().trim().max(30).nullable().optional(),
  correo: z.string().trim().email().max(150).nullable().optional(),
  estado: z.enum(['activo','inactivo']).optional(),
}).refine(d => Object.keys(d).length > 0, { message: 'al menos un campo requerido' });
const uuidParamSchema = z.string().uuid();
const listQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  estado: z.enum(['activo', 'inactivo']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});
const ajustePuntosSchema = z.object({
  puntos: z.number().int().min(-10000).max(10000).refine(v=>v!==0,{message:'puntos no puede ser 0'}),
  tipo: z.enum(['ajuste','canje']),
  motivo: z.string().trim().min(3).max(200),
});
module.exports = { createCustomerSchema, updateCustomerSchema, uuidParamSchema, listQuerySchema, ajustePuntosSchema };
