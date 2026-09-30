const { z } = require('zod');

const abrirTurnoSchema = z.object({
  monto_inicial: z.number().min(0, 'monto_inicial debe ser >= 0'),
  observacion: z.string().trim().max(200).nullable().optional(),
});

const cerrarTurnoSchema = z.object({
  monto_final_real: z.number().min(0, 'monto_final_real debe ser >= 0'),
  observacion: z.string().trim().max(200).nullable().optional(),
  // Motivo exigido por UI cuando un admin cierra turno ajeno (auditoría).
  motivo: z.string().trim().max(500).nullable().optional(),
});

// Aliases
const shiftSchema = abrirTurnoSchema;
const createShiftSchema = abrirTurnoSchema;

module.exports = { abrirTurnoSchema, cerrarTurnoSchema, shiftSchema, createShiftSchema };
