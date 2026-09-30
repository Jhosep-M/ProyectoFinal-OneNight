const { z } = require('zod');

// Alertas manuales de demostracion (Monitoreo -> POS).
// registro_consumo_id y umbral_id son nullable en alerta.model.js, asi que
// una alerta de prueba puede no venir de un consumo ni de un umbral.
const alertaPruebaSchema = z.object({
  organizacionId: z.string().uuid(),
  nivel: z.enum(['alerta', 'critico']),
  tipoRecurso: z.enum(['agua', 'energia']),
  mensaje: z.string().trim().min(1).max(500).optional(),
});

module.exports = { alertaPruebaSchema };
