const { z } = require('zod');

// Carnet de identidad boliviano:
// raiz 4-10 digitos + complemento opcional (-1A) + extension dpto opcional (LP/CB/SC/OR/PT/TJ/CH/BE/PD).
// Ejemplos: 1234567 | 1234567 LP | 1234567-1A | 1234567-1A LP
const CARNET_RE = /^[0-9]{4,10}([- ][0-9]{1,2}[A-Z])?( (LP|CB|SC|OR|PT|TJ|CH|BE|PD))?$/;
const CARNET_MSG = 'Carnet inválido. Ej. 1234567, 1234567 LP, 1234567-1A LP';

function normalizarCarnet(v) {
  if (v === undefined || v === null) return v;
  let s = String(v).trim().toUpperCase().replace(/\s+/g, ' ');
  s = s.replace(/\s*-\s*/g, '-');
  return s;
}

const carnetSchema = z.string({ required_error: 'Carnet obligatorio' })
  .trim()
  .min(4, 'Carnet obligatorio')
  .max(20, 'Carnet demasiado largo')
  .transform(normalizarCarnet)
  .pipe(z.string().regex(CARNET_RE, CARNET_MSG));

const createCustomerSchema = z.object({
  nombre: z.string().trim().min(1).max(100),
  telefono: z.string().trim().regex(/^[0-9]{8}$/, 'Teléfono debe tener exactamente 8 dígitos'),
  correo: z.string().trim().email('Correo inválido').max(150),
  carnet_identidad: carnetSchema,
  estado: z.enum(['activo','inactivo']).optional().default('activo'),
});
const updateCustomerSchema = z.object({
  nombre: z.string().trim().min(1).max(100).optional(),
  telefono: z.string().trim().regex(/^[0-9]{8}$/, 'Teléfono debe tener exactamente 8 dígitos').optional(),
  correo: z.string().trim().email('Correo inválido').max(150).optional(),
  carnet_identidad: carnetSchema.optional(),
  estado: z.enum(['activo','inactivo']).optional(),
}).refine(d => Object.keys(d).length > 0, { message: 'al menos un campo requerido' });
const uuidParamSchema = z.string().uuid();
const listQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  estado: z.enum(['activo', 'inactivo']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});
const ajustePuntosSchema = z.object({
  puntos: z.number().int().min(-10000).max(10000).refine(v=>v!==0,{message:'puntos no puede ser 0'}),
  tipo: z.enum(['ajuste','canje']),
  motivo: z.string().trim().min(3).max(200),
});
module.exports = { createCustomerSchema, updateCustomerSchema, uuidParamSchema, listQuerySchema, ajustePuntosSchema, CARNET_RE, CARNET_MSG, normalizarCarnet };
