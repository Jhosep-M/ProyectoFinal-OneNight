const { Router } = require('express');
const { z } = require('zod');
const { authenticateJWT } = require('../middlewares/authenticate');
const { authorize } = require('../middlewares/authorize');
const { sequelize } = require('../config/database');
const { auditLog } = require('../utils/audit');

const router = Router();
router.use(authenticateJWT);

const createCustomerSchema = z.object({
  nombre: z.string().trim().min(1, 'nombre requerido').max(100),
  telefono: z.string().trim().max(30).nullable().optional(),
  correo: z.string().trim().email('correo inválido').max(150).nullable().optional(),
  puntos_fidelidad: z.number().int().min(0).optional().default(0),
  estado: z.enum(['activo', 'inactivo']).optional().default('activo'),
});

const updateCustomerSchema = z.object({
  nombre: z.string().trim().min(1).max(100).optional(),
  telefono: z.string().trim().max(30).nullable().optional(),
  correo: z.string().trim().email().max(150).nullable().optional(),
  puntos_fidelidad: z.number().int().min(0).optional(),
  estado: z.enum(['activo', 'inactivo']).optional(),
}).refine((d) => Object.keys(d).length > 0, { message: 'al menos un campo requerido' });

router.get('/', authorize('cliente.consultar'), async (_req, res, next) => {
  try {
    const [rows] = await sequelize.query(`SELECT * FROM cliente ORDER BY creado_en DESC LIMIT 100`);
    res.json(rows);
  } catch (e) { next(e); }
});

router.get('/:id', authorize('cliente.consultar'), async (req, res, next) => {
  try {
    const [rows] = await sequelize.query(`SELECT * FROM cliente WHERE id_cliente=:id`, { replacements: { id: req.params.id } });
    if (!rows[0]) return res.status(404).json({ error: 'Cliente no encontrado' });
    // incluir movimientos puntos recientes
    const [movs] = await sequelize.query(`SELECT * FROM movimiento_puntos WHERE cliente_id=:id ORDER BY fecha DESC LIMIT 20`, { replacements: { id: req.params.id } });
    res.json({ ...rows[0], movimientos_puntos: movs });
  } catch (e) { next(e); }
});

router.post('/', authorize('cliente.gestionar'), async (req, res, next) => {
  try {
    const parsed = createCustomerSchema.parse(req.body);
    const [rows] = await sequelize.query(
      `INSERT INTO cliente (nombre, telefono, correo, puntos_fidelidad, estado) VALUES (:nombre, :tel, :correo, :puntos, :estado) RETURNING *`,
      { replacements: { nombre: parsed.nombre, tel: parsed.telefono || null, correo: parsed.correo || null, puntos: parsed.puntos_fidelidad, estado: parsed.estado } }
    );
    await auditLog({ usuario_id: req.user.id, accion: 'cliente.crear', entidad: 'cliente', entidad_id: rows[0].id_cliente, resultado: 'exito', detalle: parsed, ip: req.ip, userAgent: req.headers['user-agent'] });
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: e.errors });
    next(e);
  }
});

router.patch('/:id', authorize('cliente.gestionar'), async (req, res, next) => {
  try {
    const parsed = updateCustomerSchema.parse(req.body);
    const sets = [];
    const repl = { id: req.params.id };
    if (parsed.nombre !== undefined) { sets.push('nombre=:nombre'); repl.nombre = parsed.nombre; }
    if (parsed.telefono !== undefined) { sets.push('telefono=:tel'); repl.tel = parsed.telefono; }
    if (parsed.correo !== undefined) { sets.push('correo=:correo'); repl.correo = parsed.correo; }
    if (parsed.puntos_fidelidad !== undefined) { sets.push('puntos_fidelidad=:puntos'); repl.puntos = parsed.puntos_fidelidad; }
    if (parsed.estado !== undefined) { sets.push('estado=:estado'); repl.estado = parsed.estado; }
    const [rows] = await sequelize.query(`UPDATE cliente SET ${sets.join(', ')} WHERE id_cliente=:id RETURNING *`, { replacements: repl });
    if (!rows[0]) return res.status(404).json({ error: 'Cliente no encontrado' });
    await auditLog({ usuario_id: req.user.id, accion: 'cliente.actualizar', entidad: 'cliente', entidad_id: req.params.id, resultado: 'exito', detalle: parsed, ip: req.ip, userAgent: req.headers['user-agent'] });
    res.json(rows[0]);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: e.errors });
    next(e);
  }
});

module.exports = { customersRouter: router };
