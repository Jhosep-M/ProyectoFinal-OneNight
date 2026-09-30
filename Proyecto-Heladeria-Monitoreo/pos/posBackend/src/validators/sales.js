const { z } = require('zod');

const registrarVentaSchema = z.object({
  turno_id: z.string().uuid(),
  cliente_id: z.string().uuid().nullable().optional(),
  items: z.array(z.object({ producto_id: z.string().uuid(), cantidad: z.number().int().positive() })).min(1),
  descuento: z.number().min(0).default(0),
  pagos: z.array(z.object({ metodo_pago_id: z.string().uuid(), monto: z.number().positive(), referencia: z.string().max(150).nullable().optional() })).min(1),
  puntos_canje: z.number().int().min(0).optional().default(0),
  // Idempotencia opcional: acepta uuid (cliente generado) o token 8-150 chars.
  // Compat: ausente -> NULL (PG UNIQUE permite múltiples NULL; registrar_venta
  // omite el chequeo y crea fila nueva, comportamiento histórico preservado).
  idempotencyKey: z.union([z.string().uuid(), z.string().min(8).max(150)]).optional(),
});

// Canónico en validators/shifts (evita duplicar schemas de cierre).
const { cerrarTurnoSchema } = require('./shifts');

module.exports = { registrarVentaSchema, cerrarTurnoSchema };
