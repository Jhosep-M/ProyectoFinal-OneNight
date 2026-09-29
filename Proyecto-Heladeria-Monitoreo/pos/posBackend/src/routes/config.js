const { Router } = require('express');
const { z } = require('zod');
const { authenticateJWT } = require('../middlewares/authenticate');
const { authorize } = require('../middlewares/authorize');
const { sequelize } = require('../config/database');
const { auditLog } = require('../utils/audit');

const router = Router();
router.use(authenticateJWT);

const upsertConfigSchema = z.object({
  clave: z.string().trim().min(1, 'clave requerida').max(100),
  valor: z.string().trim().min(1, 'valor requerido').max(1000),
  descripcion: z.string().trim().max(500).nullable().optional(),
});

const updateConfigSchema = z.object({
  valor: z.string().trim().min(1).max(1000),
  descripcion: z.string().trim().max(500).nullable().optional(),
});

router.get('/', authorize('configuracion.consultar'), async (_req, res, next) => {
  try {
    const [rows] = await sequelize.query(`SELECT * FROM configuracion_pos ORDER BY clave`);
    res.json(rows);
  } catch (e) { next(e); }
});

router.get('/:clave', authorize('configuracion.consultar'), async (req, res, next) => {
  try {
    const [rows] = await sequelize.query(`SELECT * FROM configuracion_pos WHERE clave=:clave`, { replacements: { clave: req.params.clave } });
    if (!rows[0]) return res.status(404).json({ error: 'Config no encontrada' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

router.post('/', authorize('configuracion.gestionar'), async (req, res, next) => {
  try {
    const parsed = upsertConfigSchema.parse(req.body);
    const [rows] = await sequelize.query(
      `INSERT INTO configuracion_pos (clave, valor, descripcion) VALUES (:clave, :valor, :desc) ON CONFLICT (clave) DO UPDATE SET valor=:valor, descripcion=:desc, actualizado_en=NOW() RETURNING *`,
      { replacements: { clave: parsed.clave, valor: parsed.valor, desc: parsed.descripcion || null } }
    );
    await auditLog({ usuario_id: req.user.id, accion: 'configuracion.upsert', entidad: 'configuracion_pos', entidad_id: rows[0].id_configuracion, resultado: 'exito', detalle: parsed, ip: req.ip, userAgent: req.headers['user-agent'] });
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: e.errors });
    next(e);
  }
});

router.put('/:clave', authorize('configuracion.gestionar'), async (req, res, next) => {
  try {
    const parsed = updateConfigSchema.parse(req.body);
    const [rows] = await sequelize.query(`UPDATE configuracion_pos SET valor=:valor, descripcion=COALESCE(:desc, descripcion), actualizado_en=NOW() WHERE clave=:clave RETURNING *`, { replacements: { clave: req.params.clave, valor: parsed.valor, desc: parsed.descripcion ?? null } });
    if (!rows[0]) return res.status(404).json({ error: 'Config no encontrada' });
    await auditLog({ usuario_id: req.user.id, accion: 'configuracion.actualizar', entidad: 'configuracion_pos', entidad_id: rows[0].id_configuracion, resultado: 'exito', detalle: parsed, ip: req.ip, userAgent: req.headers['user-agent'] });
    res.json(rows[0]);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: e.errors });
    next(e);
  }
});

router.delete('/:clave', authorize('configuracion.gestionar'), async (req, res, next) => {
  try {
    const [rows] = await sequelize.query(`DELETE FROM configuracion_pos WHERE clave=:clave RETURNING *`, { replacements: { clave: req.params.clave } });
    if (!rows[0]) return res.status(404).json({ error: 'Config no encontrada' });
    await auditLog({ usuario_id: req.user.id, accion: 'configuracion.eliminar', entidad: 'configuracion_pos', entidad_id: rows[0].id_configuracion, resultado: 'exito', detalle: { clave: req.params.clave }, ip: req.ip, userAgent: req.headers['user-agent'] });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = { configRouter: router };
