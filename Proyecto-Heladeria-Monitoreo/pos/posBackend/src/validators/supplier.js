const { z } = require('zod');

const createSupplierSchema = z.object({
  nombre: z.string().trim().min(1, 'nombre requerido').max(100),
  nit: z.string().trim().max(30).nullable().optional(),
  contacto: z.string().trim().max(100).nullable().optional(),
  telefono: z.string().trim().max(30).nullable().optional(),
  correo: z.string().trim().email('correo inválido').max(150).nullable().optional(),
  estado: z.enum(['activo', 'inactivo']).optional().default('activo'),
});

const updateSupplierSchema = z.object({
  nombre: z.string().trim().min(1).max(100).optional(),
  nit: z.string().trim().max(30).nullable().optional(),
  contacto: z.string().trim().max(100).nullable().optional(),
  telefono: z.string().trim().max(30).nullable().optional(),
  correo: z.string().trim().email().max(150).nullable().optional(),
  estado: z.enum(['activo', 'inactivo']).optional(),
}).refine((d) => Object.keys(d).length > 0, { message: 'al menos un campo requerido' });

module.exports = { createSupplierSchema, updateSupplierSchema };
