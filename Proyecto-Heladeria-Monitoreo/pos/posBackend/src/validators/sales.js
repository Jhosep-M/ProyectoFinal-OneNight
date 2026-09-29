const { z } = require('zod');

const registrarVentaSchema = z.object({
  turno_id: z.string().uuid(),
  cliente_id: z.string().uuid().nullable().optional(),
  items: z.array(z.object({ producto_id: z.string().uuid(), cantidad: z.number().int().positive() })).min(1),
  descuento: z.number().min(0).default(0),
  pagos: z.array(z.object({ metodo_pago_id: z.string().uuid(), monto: z.number().positive(), referencia: z.string().max(150).nullable().optional() })).min(1),
});

const cerrarTurnoSchema = z.object({
  monto_final_real: z.number().min(0),
});

module.exports = { registrarVentaSchema, cerrarTurnoSchema };
