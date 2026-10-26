const { z } = require('zod');

const orderItemSchema = z.object({
  producto_id: z.string().uuid(),
  cantidad: z.number().int().positive('cantidad debe ser entero > 0'),
  observacion: z.string().trim().max(500).nullable().optional(),
}).strip();

const createOrderSchema = z.object({
  mesa_id: z.string().uuid().nullable().optional(),
  mesero_id: z.string().uuid().nullable().optional(),
  estado: z.enum(['abierto', 'en_preparacion', 'listo', 'cerrado', 'cancelado']).optional().default('abierto'),
  origen: z.enum(['mesa', 'mostrador', 'venta_directa']).optional().default('mesa'),
  // Solo para espejos de venta directa: enlaza la venta ya cobrada al pedido
  // para trazabilidad (defensa en profundidad junto a origen).
  venta_id: z.string().uuid().nullable().optional(),
  items: z.array(orderItemSchema).min(1, 'al menos un item requerido'),
  observacion: z.string().trim().max(500).nullable().optional(),
});

const updateOrderSchema = z.object({
  mesa_id: z.string().uuid().nullable().optional(),
  estado: z.enum(['abierto', 'en_preparacion', 'listo', 'cerrado', 'cancelado']).optional(),
  origen: z.enum(['mesa', 'mostrador', 'venta_directa']).optional(),
  items: z.array(orderItemSchema).min(1).optional(),
  observacion: z.string().trim().max(500).nullable().optional(),
}).refine((data) => Object.keys(data).length > 0, { message: 'al menos un campo requerido' });

// Aliases exigidos por spec
const orderSchema = createOrderSchema;
const pedidoSchema = createOrderSchema;

const cobrarPedidoSchema = z.object({
  turno_id: z.string().uuid(),
  pagos: z
    .array(
      z.object({
        metodo_pago_id: z.string().uuid(),
        monto: z.number().positive('monto debe ser > 0'),
        referencia: z.string().max(150).nullable().optional(),
      })
    )
    .min(1, 'al menos un pago requerido'),
});

// HU-04 Cocina: solo puede avanzar abierto -> en_preparacion -> listo.
// Ni cerrar/cobrar ni cancelar desde este endpoint (409 con mensaje humano).
const estadoCocinaSchema = z.object({
  estado: z.enum(['abierto', 'en_preparacion', 'listo']),
});

module.exports = { orderSchema, pedidoSchema, createOrderSchema, updateOrderSchema, orderItemSchema, cobrarPedidoSchema, estadoCocinaSchema };
