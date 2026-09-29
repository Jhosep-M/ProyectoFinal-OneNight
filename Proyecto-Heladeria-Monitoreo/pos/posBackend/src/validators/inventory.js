const { z } = require('zod');

const createInsumoSchema = z.object({
  nombre: z.string().trim().min(1, 'nombre requerido').max(100),
  unidad_medida: z.string().trim().min(1, 'unidad_medida requerida').max(50),
  stock: z.number().min(0).optional().default(0),
  stock_minimo: z.number().min(0).nullable().optional(),
  fecha_vencimiento: z.coerce.date().nullable().optional(),
  estado: z.enum(['disponible', 'no_disponible', 'vencido', 'inactivo']).optional().default('disponible'),
  proveedor_id: z.string().uuid().nullable().optional(),
});

const updateInsumoSchema = z.object({
  nombre: z.string().trim().min(1).max(100).optional(),
  unidad_medida: z.string().trim().min(1).max(50).optional(),
  stock: z.number().min(0).optional(),
  stock_minimo: z.number().min(0).nullable().optional(),
  fecha_vencimiento: z.coerce.date().nullable().optional(),
  estado: z.enum(['disponible', 'no_disponible', 'vencido', 'inactivo']).optional(),
  proveedor_id: z.string().uuid().nullable().optional(),
}).refine((data) => Object.keys(data).length > 0, { message: 'al menos un campo requerido' });

const createMovimientoInventarioSchema = z.object({
  insumo_id: z.string().uuid().nullable().optional(),
  producto_id: z.string().uuid().nullable().optional(),
  proveedor_id: z.string().uuid().nullable().optional(),
  tipo: z.string().trim().min(1).max(30),
  cantidad: z.number().positive('cantidad debe ser > 0'),
  motivo: z.string().trim().max(200).nullable().optional(),
});

// Alias genérico para compatibilidad
const inventorySchema = createInsumoSchema;
const insumoSchema = createInsumoSchema;

module.exports = {
  inventorySchema,
  insumoSchema,
  createInsumoSchema,
  updateInsumoSchema,
  createMovimientoInventarioSchema,
};
