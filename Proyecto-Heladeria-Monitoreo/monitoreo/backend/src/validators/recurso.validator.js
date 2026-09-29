const { z } = require('zod');

const recursoSchema = z.object({
  codigo: z.enum(['agua', 'energia']),
  nombre: z.string().trim().min(1).max(60),
  unidadBase: z.string().trim().min(1).max(20),
});

module.exports = { recursoSchema };
