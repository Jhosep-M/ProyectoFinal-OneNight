const { Router } = require('express');
const { z } = require('zod');
const { authenticateJWT } = require('../middlewares/authenticate');
const { authorize } = require('../middlewares/authorize');
const { sequelize } = require('../config/database');
const { auditLog } = require('../utils/audit');

const router = Router();
router.use(authenticateJWT);

const createPromoSchema = z.object({
  nombre: z.string().trim().min(1, 'nombre requerido').max(100),
  porcentaje_descuento: z.number().min(0).max(100, '0-100'),
  fecha_inicio: z.coerce.date().nullable().optional(),
  fecha_fin: z.coerce.date().nullable().optional(),
  estado: z.enum(['activa', 'inactiva', 'finalizada']).optional().default('activa'),
  producto_ids: z.array(z.string().uuid()).optional().default([]),
}).refine((d) => !d.fecha_inicio || !d.fecha_fin || d.fecha_fin >= d.fecha_inicio, { message: 'fecha_fin debe ser >= fecha_inicio' });

const updatePromoSchema = z.object({
  nombre: z.string().trim().min(1).max(100).optional(),
  porcentaje_descuento: z.number().min(0).max(100).optional(),
  fecha_inicio: z.coerce.date().nullable().optional(),
  fecha_fin: z.coerce.date().nullable().optional(),
  estado: z.enum(['activa', 'inactiva', 'finalizada']).optional(),
  producto_ids: z.array(z.string().uuid()).optional(),
}).refine((d) => Object.keys(d).length > 0, { message: 'al menos un campo requerido' });

router.get('/', authorize('promocion.consultar'), async (_req, res, next) => {
  try {
    const [rows] = await sequelize.query(`SELECT * FROM promocion ORDER BY fecha_inicio DESC LIMIT 100`);
    // adjuntar conteo productos
    const [all] = await sequelize.query(`SELECT promocion_id, COUNT(*) as productos FROM promocion_producto GROUP BY promocion_id`);
    const map = new Map(all.map(r => [r.promocion_id, r.productos]));
    res.json(rows.map(r => ({ ...r, productos_count: map.get(r.id_promocion) || 0 })));
  } catch (e) { next(e); }
});

router.get('/:id', authorize('promocion.consultar'), async (req, res, next) => {
  try {
    const [rows] = await sequelize.query(`SELECT * FROM promocion WHERE id_promocion=:id`, { replacements: { id: req.params.id } });
    if (!rows[0]) return res.status(404).json({ error: 'Promoción no encontrada' });
    const [prods] = await sequelize.query(`SELECT pp.*, pr.nombre as producto_nombre FROM promocion_producto pp LEFT JOIN producto pr ON pr.id_producto=pp.producto_id WHERE pp.promocion_id=:id`, { replacements: { id: req.params.id } });
    res.json({ ...rows[0], productos: prods });
  } catch (e) { next(e); }
});

router.post('/', authorize('promocion.gestionar'), async (req, res, next) => {
  try {
    const parsed = createPromoSchema.parse(req.body);
    const [rows] = await sequelize.query(
      `INSERT INTO promocion (nombre, porcentaje_descuento, fecha_inicio, fecha_fin, estado) VALUES (:nombre, :desc, :ini, :fin, :estado) RETURNING *`,
      { replacements: { nombre: parsed.nombre, desc: parsed.porcentaje_descuento, ini: parsed.fecha_inicio || null, fin: parsed.fecha_fin || null, estado: parsed.estado } }
    );
    const promo = rows[0];
    if (parsed.producto_ids?.length) {
      for (const pid of parsed.producto_ids) {
        await sequelize.query(`INSERT INTO promocion_producto (promocion_id, producto_id) VALUES (:promo, :prod) ON CONFLICT DO NOTHING`, { replacements: { promo: promo.id_promocion, prod: pid } });
      }
    }
    await auditLog({ usuario_id: req.user.id, accion: 'promocion.crear', entidad: 'promocion', entidad_id: promo.id_promocion, resultado: 'exito', detalle: parsed, ip: req.ip, userAgent: req.headers['user-agent'] });
    res.status(201).json(promo);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: e.errors });
    next(e);
  }
});

router.patch('/:id', authorize('promocion.gestionar'), async (req, res, next) => {
  try {
    const parsed = updatePromoSchema.parse(req.body);
    const sets = [];
    const repl = { id: req.params.id };
    if (parsed.nombre !== undefined) { sets.push('nombre=:nombre'); repl.nombre = parsed.nombre; }
    if (parsed.porcentaje_descuento !== undefined) { sets.push('porcentaje_descuento=:desc'); repl.desc = parsed.porcentaje_descuento; }
    if (parsed.fecha_inicio !== undefined) { sets.push('fecha_inicio=:ini'); repl.ini = parsed.fecha_inicio; }
    if (parsed.fecha_fin !== undefined) { sets.push('fecha_fin=:fin'); repl.fin = parsed.fecha_fin; }
    if (parsed.estado !== undefined) { sets.push('estado=:estado'); repl.estado = parsed.estado; }
    let promo;
    if (sets.length > 0) {
      const [rows] = await sequelize.query(`UPDATE promocion SET ${sets.join(', ')} WHERE id_promocion=:id RETURNING *`, { replacements: repl });
      if (!rows[0]) return res.status(404).json({ error: 'Promoción no encontrada' });
      promo = rows[0];
    } else {
      const [rows] = await sequelize.query(`SELECT * FROM promocion WHERE id_promocion=:id`, { replacements: { id: req.params.id } });
      if (!rows[0]) return res.status(404).json({ error: 'Promoción no encontrada' });
      promo = rows[0];
    }
    if (parsed.producto_ids !== undefined) {
      await sequelize.query(`DELETE FROM promocion_producto WHERE promocion_id=:id`, { replacements: { id: req.params.id } });
      for (const pid of parsed.producto_ids) {
        await sequelize.query(`INSERT INTO promocion_producto (promocion_id, producto_id) VALUES (:promo, :prod) ON CONFLICT DO NOTHING`, { replacements: { promo: req.params.id, prod: pid } });
      }
    }
    await auditLog({ usuario_id: req.user.id, accion: 'promocion.actualizar', entidad: 'promocion', entidad_id: req.params.id, resultado: 'exito', detalle: parsed, ip: req.ip, userAgent: req.headers['user-agent'] });
    res.json(promo);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: e.errors });
    next(e);
  }
});

module.exports = { promotionsRouter: router, createPromoSchema, updatePromoSchema };
