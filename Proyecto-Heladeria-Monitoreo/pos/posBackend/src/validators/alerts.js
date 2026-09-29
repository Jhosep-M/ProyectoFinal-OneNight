const { z } = require('zod');

// Espejo estricto del contrato shared/contracts/monitoring-to-pos/alert.schema.json (alerts.v1)
const alertSchema = z
  .object({
    alertaId: z.string().uuid(),
    nivel: z.enum(['info', 'advertencia', 'critico']),
    tipoRecurso: z.enum(['agua', 'energia']),
    mensaje: z.string().min(1).max(500),
    fechaGeneracion: z.string().datetime(),
  })
  .strict();

module.exports = { alertSchema };
