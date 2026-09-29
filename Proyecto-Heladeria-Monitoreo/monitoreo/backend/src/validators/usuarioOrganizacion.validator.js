const { z } = require('zod');

const usuarioOrganizacionSchema = z.object({
  usuarioId: z.string().uuid(),
  email: z.string().trim().email().max(160),
  organizacionId: z.string().uuid(),
  rolId: z.string().uuid(),
});

const usuarioOrganizacionUpdateSchema = z.object({
  rolId: z.string().uuid().optional(),
  estado: z.enum(['activo', 'inactivo']).optional(),
}).refine((v) => Object.keys(v).length > 0, { message: 'sin cambios' });

module.exports = { usuarioOrganizacionSchema, usuarioOrganizacionUpdateSchema };
