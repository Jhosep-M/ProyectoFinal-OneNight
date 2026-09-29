const { z } = require('zod');

// Vocabulario alineado al CHECK PG de public.pago:
// CHECK (estado IN ('pendiente','confirmado','anulado','reembolsado'))
const createPagoSchema = z.object({
  venta_id: z.string().uuid(),
  metodo_pago_id: z.string().uuid(),
  monto: z.number().positive('monto debe ser > 0'),
  referencia: z.string().trim().max(150).nullable().optional(),
  estado: z.enum(['pendiente', 'confirmado', 'anulado']).optional().default('confirmado'),
});

module.exports = { createPagoSchema };
