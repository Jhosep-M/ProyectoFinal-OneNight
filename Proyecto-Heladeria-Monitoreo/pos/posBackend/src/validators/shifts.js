const { z } = require('zod');

const abrirTurnoSchema = z.object({
  monto_inicial: z.number().min(0, 'monto_inicial debe ser >= 0'),
  observacion: z.string().trim().max(200).nullable().optional(),
});

const cerrarTurnoSchema = z.object({
  monto_final_real: z.number().min(0, 'monto_final_real debe ser >= 0'),
  observacion: z.string().trim().max(200).nullable().optional(),
  // Motivo exigido por UI cuando la diferencia supera el umbral o el turno es ajeno.
  // La función PG vuelve a validar (>=5) y dispara 'MOTIVO_REQUERIDO' si falta.
  motivo: z.string().trim().min(5, 'motivo debe tener al menos 5 caracteres').max(500).nullable().optional(),
});

// Aliases
const shiftSchema = abrirTurnoSchema;
const createShiftSchema = abrirTurnoSchema;

module.exports = { abrirTurnoSchema, cerrarTurnoSchema, shiftSchema, createShiftSchema };
