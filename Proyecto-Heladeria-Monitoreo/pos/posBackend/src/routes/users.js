const { Router } = require('express');
const { z } = require('zod');
const { authenticateJWT } = require('../middlewares/authenticate');
const { authorize } = require('../middlewares/authorize');
const { requireAdmin } = require('../middlewares/requireAdmin');
const { sequelize } = require('../config/database');
const { supabaseService } = require('../config/supabase');
const { auditLog } = require('../utils/audit');

const router = Router();
router.use(authenticateJWT);

// Solo lectura: cualquier rol con usuario.gestionar puede ver.
// Mutaciones (POST/PATCH/DELETE): solo admin estricto (rol.nombre='admin').

const createUserSchema = z.object({
  nombre: z.string().trim().min(1, 'nombre requerido').max(100),
  email: z.string().trim().email('email inválido').max(150),
  password: z.string().min(8, 'mínimo 8 caracteres').max(100),
  rol_id: z.string().uuid().optional(),
  rol: z.string().trim().min(1).max(50).optional(),
}).refine((d) => d.rol_id || d.rol, { message: 'rol requerido (rol o rol_id)' });

const updateUserSchema = z.object({
  nombre: z.string().trim().min(1).max(100).optional(),
  email: z.string().trim().email().max(150).optional(),
  password: z.string().min(8, 'mínimo 8 caracteres').max(100).optional(),
  rol_id: z.string().uuid().optional(),
  rol: z.string().trim().min(1).max(50).optional(),
}).refine((d) => Object.keys(d).length > 0, { message: 'al menos un campo requerido' });

async function resolveRolId({ rol_id, rol }) {
  if (rol_id) {
    const [rows] = await sequelize.query(
      `SELECT id_rol FROM rol WHERE id_rol=:id AND estado='activo'`,
      { replacements: { id: rol_id } }
    );
    if (!rows[0]) {
      const e = new Error('Rol no válido');
      e.status = 400;
      throw e;
    }
    return rows[0].id_rol;
  }
  const [rows] = await sequelize.query(
    `SELECT id_rol FROM rol WHERE lower(nombre)=lower(:n) AND estado='activo'`,
    { replacements: { n: rol } }
  );
  if (!rows[0]) {
    const e = new Error('Rol no válido');
    e.status = 400;
    throw e;
  }
  return rows[0].id_rol;
}

// GET /api/v1/users/roles -> catálogo de roles activos (para el Select, sin UUID manual)
router.get('/roles', authorize('usuario.gestionar'), async (_req, res, next) => {
  try {
    const [rows] = await sequelize.query(
      `SELECT id_rol, nombre, descripcion FROM rol WHERE estado='activo' ORDER BY nombre`
    );
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /api/v1/users -> listar (sin columna estado en la respuesta pública)
router.get('/', authorize('usuario.gestionar'), async (_req, res, next) => {
  try {
    const [rows] = await sequelize.query(
      `SELECT u.id_usuario, u.nombre, u.email, u.rol_id, r.nombre AS rol, u.creado_en, u.actualizado_en
       FROM usuario u LEFT JOIN rol r ON r.id_rol = u.rol_id
       ORDER BY u.creado_en DESC LIMIT 100`
    );
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /api/v1/users/:id
router.get('/:id', authorize('usuario.gestionar'), async (req, res, next) => {
  try {
    const [rows] = await sequelize.query(
      `SELECT u.id_usuario, u.nombre, u.email, u.rol_id, r.nombre AS rol, u.creado_en, u.actualizado_en
       FROM usuario u LEFT JOIN rol r ON r.id_rol = u.rol_id
       WHERE u.id_usuario=:id`,
      { replacements: { id: req.params.id } }
    );
    if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

// POST /api/v1/users — SOLO ADMIN. Crea en Supabase Auth + public.usuario.
router.post('/', requireAdmin, async (req, res, next) => {
  let authId = null;
  try {
    const parsed = createUserSchema.parse(req.body);
    const rolId = await resolveRolId(parsed);
    if (!supabaseService) {
      return res.status(500).json({ error: 'Auth no configurado' });
    }
    // 1. Crear identidad en Supabase Auth (la contraseña vive SOLO ahí, AGENTS §4.2).
    const { data, error } = await supabaseService.auth.admin.createUser({
      email: parsed.email,
      password: parsed.password,
      email_confirm: true,
      user_metadata: { nombre: parsed.nombre, rol: parsed.rol || undefined },
    });
    if (error || !data?.user?.id) {
      const msg = String(error?.message || '');
      if (/already|exists|duplicate/i.test(msg)) {
        return res.status(409).json({ error: 'Email ya existe' });
      }
      return res.status(400).json({ error: 'No se pudo crear el usuario en Auth' });
    }
    authId = data.user.id;
    // 2. Fila espejo en public.usuario (id = auth.users.id, estado interno siempre 'activo').
    let rows;
    try {
      [rows] = await sequelize.query(
        `INSERT INTO usuario (id_usuario, nombre, email, rol_id, estado)
         VALUES (:id, :nombre, :email, :rol, 'activo')
         RETURNING id_usuario, nombre, email, rol_id, creado_en`,
        { replacements: { id: authId, nombre: parsed.nombre, email: parsed.email, rol: rolId } }
      );
    } catch (dbErr) {
      // Rollback: no dejar huérfano en Auth si falla el INSERT.
      try { await supabaseService.auth.admin.deleteUser(authId); } catch (_) { /* noop */ }
      if (dbErr?.original?.code === '23505' || /duplicate|unique/i.test(String(dbErr?.message))) {
        return res.status(409).json({ error: 'Email ya existe' });
      }
      throw dbErr;
    }
    await auditLog({ usuario_id: req.user.id, accion: 'usuario.crear', entidad: 'usuario', entidad_id: rows[0].id_usuario, resultado: 'exitoso', detalle: { email: parsed.email, rol_id: rolId }, ip: req.ip, userAgent: req.headers['user-agent'] });
    res.status(201).json({ ...rows[0] });
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: e.errors });
    if (e.status === 400) return res.status(400).json({ error: e.message });
    if (e.original?.code === '23505') return res.status(409).json({ error: 'Email ya existe' });
    next(e);
  }
});

// PATCH /api/v1/users/:id — SOLO ADMIN. Sin campo estado.
router.patch('/:id', requireAdmin, async (req, res, next) => {
  try {
    const parsed = updateUserSchema.parse(req.body);
    const sets = [];
    const repl = { id: req.params.id };
    if (parsed.nombre !== undefined) { sets.push('nombre=:nombre'); repl.nombre = parsed.nombre; }
    if (parsed.email !== undefined) { sets.push('email=:email'); repl.email = parsed.email; }
    let rolId;
    if (parsed.rol_id !== undefined || parsed.rol !== undefined) {
      rolId = await resolveRolId({ rol_id: parsed.rol_id, rol: parsed.rol });
      sets.push('rol_id=:rol'); repl.rol = rolId;
    }
    if (sets.length === 0 && parsed.password === undefined) {
      return res.status(400).json({ error: 'al menos un campo requerido' });
    }
    // Contraseña: solo en Auth, nunca en public.usuario.
    if (parsed.password !== undefined) {
      if (!supabaseService) return res.status(500).json({ error: 'Auth no configurado' });
      const { error } = await supabaseService.auth.admin.updateUserById(req.params.id, { password: parsed.password });
      if (error) {
        const msg = String(error.message || '');
        if (/weak|short|password/i.test(msg)) return res.status(400).json({ error: 'Contraseña no válida (mínimo 8 caracteres)' });
        return res.status(400).json({ error: 'No se pudo actualizar la contraseña' });
      }
      if (parsed.email !== undefined) {
        await supabaseService.auth.admin.updateUserById(req.params.id, { email: parsed.email });
      }
    } else if (parsed.email !== undefined) {
      // Mantener email sincronizado en Auth cuando cambia solo el email.
      if (supabaseService) {
        try { await supabaseService.auth.admin.updateUserById(req.params.id, { email: parsed.email }); } catch (_) { /* noop: no bloquear */ }
      }
    }
    if (sets.length > 0) {
      const [rows] = await sequelize.query(
        `UPDATE usuario SET ${sets.join(', ')}, actualizado_en=NOW()
         WHERE id_usuario=:id
         RETURNING id_usuario, nombre, email, rol_id`,
        { replacements: repl }
      );
      if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' });
      await auditLog({ usuario_id: req.user.id, accion: 'usuario.actualizar', entidad: 'usuario', entidad_id: req.params.id, resultado: 'exitoso', detalle: { ...parsed, password: undefined }, ip: req.ip, userAgent: req.headers['user-agent'] });
      return res.json(rows[0]);
    }
    await auditLog({ usuario_id: req.user.id, accion: 'usuario.actualizar', entidad: 'usuario', entidad_id: req.params.id, resultado: 'exitoso', detalle: { password: '***' }, ip: req.ip, userAgent: req.headers['user-agent'] });
    const [rows] = await sequelize.query(
      `SELECT u.id_usuario, u.nombre, u.email, u.rol_id, r.nombre AS rol
       FROM usuario u LEFT JOIN rol r ON r.id_rol=u.rol_id WHERE u.id_usuario=:id`,
      { replacements: { id: req.params.id } }
    );
    if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' });
    return res.json(rows[0]);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: e.errors });
    if (e.status === 400) return res.status(400).json({ error: e.message });
    if (e.original?.code === '23505') return res.status(409).json({ error: 'Email ya existe' });
    next(e);
  }
});

// DELETE /api/v1/users/:id — SOLO ADMIN.
router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const targetId = req.params.id;
    if (targetId === req.user.id) {
      return res.status(403).json({ error: 'No puedes eliminar tu propio usuario' });
    }
    const [target] = await sequelize.query(
      `SELECT u.id_usuario, lower(r.nombre) AS rol FROM usuario u
       LEFT JOIN rol r ON r.id_rol = u.rol_id WHERE u.id_usuario=:id`,
      { replacements: { id: targetId } }
    );
    if (!target[0]) return res.status(404).json({ error: 'Usuario no encontrado' });
    // Proteger al último admin.
    if (target[0].rol === 'admin') {
      const [count] = await sequelize.query(
        `SELECT COUNT(*)::int AS n FROM usuario u JOIN rol r ON r.id_rol=u.rol_id
         WHERE lower(r.nombre)='admin' AND u.id_usuario <> :id`,
        { replacements: { id: targetId } }
      );
      if (!count[0] || count[0].n < 1) {
        return res.status(409).json({ error: 'No se puede eliminar al último administrador' });
      }
    }
    // Bloquear si tiene historial operativo (turnos, pedidos, movimientos, devoluciones).
    const [uso] = await sequelize.query(
      `SELECT
        (SELECT COUNT(*) FROM turno_caja WHERE usuario_id=:id) AS turnos,
        (SELECT COUNT(*) FROM pedido WHERE mesero_id=:id) AS pedidos,
        (SELECT COUNT(*) FROM movimiento_inventario WHERE usuario_id=:id) AS movimientos,
        (SELECT COUNT(*) FROM devolucion WHERE autorizado_por_id=:id) AS devoluciones,
        (SELECT COUNT(*) FROM alerta_pos WHERE atendido_por=:id) AS alertas`,
      { replacements: { id: targetId } }
    );
    const u = uso[0] || {};
    const total = Number(u.turnos || 0) + Number(u.pedidos || 0) + Number(u.movimientos || 0) + Number(u.devoluciones || 0) + Number(u.alertas || 0);
    if (total > 0) {
      return res.status(409).json({ error: 'No se puede eliminar: el usuario tiene historial operativo (turnos, pedidos o movimientos)' });
    }
    await sequelize.query(`DELETE FROM usuario WHERE id_usuario=:id`, { replacements: { id: targetId } });
    if (supabaseService) {
      try { await supabaseService.auth.admin.deleteUser(targetId); } catch (_) { /* noop: ya se borró el espejo */ }
    }
    await auditLog({ usuario_id: req.user.id, accion: 'usuario.eliminar', entidad: 'usuario', entidad_id: targetId, resultado: 'exitoso', detalle: {}, ip: req.ip, userAgent: req.headers['user-agent'] });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = { usersRouter: router };
