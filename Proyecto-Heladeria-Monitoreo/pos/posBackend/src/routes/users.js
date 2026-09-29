const { Router } = require('express');
const { z } = require('zod');
const { authenticateJWT } = require('../middlewares/authenticate');
const { authorize } = require('../middlewares/authorize');
const { sequelize } = require('../config/database');
const { auditLog } = require('../utils/audit');

const router = Router();
router.use(authenticateJWT);

const createUserSchema = z.object({
  nombre: z.string().trim().min(1, 'nombre requerido').max(100),
  email: z.string().trim().email('email inválido').max(150),
  rol_id: z.string().uuid().nullable().optional(),
  estado: z.enum(['activo', 'inactivo']).optional().default('activo'),
});

const updateUserSchema = z.object({
  nombre: z.string().trim().min(1).max(100).optional(),
  email: z.string().trim().email().max(150).optional(),
  rol_id: z.string().uuid().nullable().optional(),
  estado: z.enum(['activo', 'inactivo']).optional(),
}).refine((d) => Object.keys(d).length > 0, { message: 'al menos un campo requerido' });

// GET /api/v1/users -> listar
router.get('/', authorize('usuario.gestionar'), async (_req, res, next) => {
  try {
    const [rows] = await sequelize.query(`SELECT id_usuario, nombre, email, rol_id, estado, creado_en, actualizado_en FROM usuario ORDER BY creado_en DESC LIMIT 100`);
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /api/v1/users/:id
router.get('/:id', authorize('usuario.gestionar'), async (req, res, next) => {
  try {
    const [rows] = await sequelize.query(`SELECT id_usuario, nombre, email, rol_id, estado, creado_en, actualizado_en FROM usuario WHERE id_usuario=:id`, { replacements: { id: req.params.id } });
    if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

// POST /api/v1/users
router.post('/', authorize('usuario.gestionar'), async (req, res, next) => {
  try {
    const parsed = createUserSchema.parse(req.body);
    const [rows] = await sequelize.query(
      `INSERT INTO usuario (nombre, email, rol_id, estado) VALUES (:nombre, :email, :rol, :estado) RETURNING id_usuario, nombre, email, rol_id, estado, creado_en`,
      { replacements: { nombre: parsed.nombre, email: parsed.email, rol: parsed.rol_id || null, estado: parsed.estado } }
    );
    await auditLog({ usuario_id: req.user.id, accion: 'usuario.crear', entidad: 'usuario', entidad_id: rows[0].id_usuario, resultado: 'exito', detalle: { email: parsed.email }, ip: req.ip, userAgent: req.headers['user-agent'] });
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: e.errors });
    if (e.original?.code === '23505') return res.status(409).json({ error: 'Email ya existe' });
    next(e);
  }
});

// PATCH /api/v1/users/:id
router.patch('/:id', authorize('usuario.gestionar'), async (req, res, next) => {
  try {
    const parsed = updateUserSchema.parse(req.body);
    const sets = [];
    const repl = { id: req.params.id };
    if (parsed.nombre !== undefined) { sets.push('nombre=:nombre'); repl.nombre = parsed.nombre; }
    if (parsed.email !== undefined) { sets.push('email=:email'); repl.email = parsed.email; }
    if (parsed.rol_id !== undefined) { sets.push('rol_id=:rol'); repl.rol = parsed.rol_id; }
    if (parsed.estado !== undefined) { sets.push('estado=:estado'); repl.estado = parsed.estado; }
    const [rows] = await sequelize.query(`UPDATE usuario SET ${sets.join(', ')}, actualizado_en=NOW() WHERE id_usuario=:id RETURNING id_usuario, nombre, email, rol_id, estado`, { replacements: repl });
    if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' });
    await auditLog({ usuario_id: req.user.id, accion: 'usuario.actualizar', entidad: 'usuario', entidad_id: req.params.id, resultado: 'exito', detalle: parsed, ip: req.ip, userAgent: req.headers['user-agent'] });
    res.json(rows[0]);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: e.errors });
    if (e.original?.code === '23505') return res.status(409).json({ error: 'Email ya existe' });
    next(e);
  }
});

module.exports = { usersRouter: router };
