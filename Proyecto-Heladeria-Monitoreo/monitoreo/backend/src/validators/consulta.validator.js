const { z } = require('zod');

const rangoSchema = z.object({
  organizacionId: z.string().uuid(),
  desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  nivel: z.enum(['alerta', 'critico']).optional(),
  limite: z.coerce.number().int().min(1).max(50).default(10),
}).refine((v) => !v.desde || !v.hasta || v.desde <= v.hasta, {
  message: 'desde debe ser <= hasta', path: ['hasta'],
});

// PATCH /notificaciones/:id solo admite marcar como vista.
const notificacionVistaSchema = z.object({ accion: z.literal('vista') });

module.exports = { rangoSchema, notificacionVistaSchema };
