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
}).refine((d) => Object.keys(d).length > 0, { message: 'al menos un campo requerido' })
  .refine((d) => !d.fecha_inicio || !d.fecha_fin || d.fecha_fin >= d.fecha_inicio, { message: 'fecha_fin debe ser >= fecha_inicio' });

async function existeSolape({ productoIds, fechaInicio, fechaFin, excluirId }) {
  if (!productoIds?.length) return null;
  const [rows] = await sequelize.query(
    `SELECT p.id_promocion, p.nombre FROM promocion p
     JOIN promocion_producto pp ON pp.promocion_id = p.id_promocion
     WHERE pp.producto_id = ANY(CAST(:ids AS uuid[]))
       AND p.id_promocion <> CAST(:excluir AS uuid)
       AND p.estado = 'activa'
       AND daterange(COALESCE(p.fecha_inicio::date, '-infinity'::date), COALESCE(p.fecha_fin::date, 'infinity'::date), '[]')
         && daterange(COALESCE(CAST(:ini AS date), '-infinity'::date), COALESCE(CAST(:fin AS date), 'infinity'::date), '[]')
     LIMIT 1`,
    {
      replacements: {
        ids: `{${productoIds.join(',')}}`,
        excluir: excluirId || '00000000-0000-0000-0000-000000000000',
        ini: fechaInicio ? new Date(fechaInicio).toISOString().slice(0, 10) : null,
        fin: fechaFin ? new Date(fechaFin).toISOString().slice(0, 10) : null,
      },
    }
  );
  return rows[0] || null;
}

router.get('/', authorize('promocion.consultar'), async (_req, res, next) => {
  try {
    const [rows] = await sequelize.query(`SELECT * FROM promocion WHERE estado <> 'inactiva' ORDER BY fecha_inicio DESC LIMIT 100`);
    // adjuntar productos (nombres) + conteo para la vista de vigentes
    const [pp] = await sequelize.query(
      `SELECT pp.promocion_id, pp.producto_id, pr.nombre AS producto_nombre
       FROM promocion_producto pp LEFT JOIN producto pr ON pr.id_producto = pp.producto_id`
    );
    const byId = new Map();
    for (const r of pp) {
      if (!byId.has(r.promocion_id)) byId.set(r.promocion_id, []);
      byId.get(r.promocion_id).push(r);
    }
    res.json(rows.map(r => ({ ...r, productos: byId.get(r.id_promocion) || [], productos_count: (byId.get(r.id_promocion) || []).length })));
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
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    if (parsed.fecha_inicio && new Date(parsed.fecha_inicio) < hoy) {
      return res.status(400).json({ error: 'Validation failed', details: [{ message: 'fecha_inicio no puede ser anterior a hoy' }] });
    }
    if (parsed.estado === 'activa' && parsed.producto_ids?.length) {
      const solape = await existeSolape({
        productoIds: parsed.producto_ids,
        fechaInicio: parsed.fecha_inicio || null,
        fechaFin: parsed.fecha_fin || null,
        excluirId: null,
      });
      if (solape) return res.status(409).json({ error: `El rango de fechas se solapa con otra promoción activa (${solape.nombre}) para los mismos productos` });
    }
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
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: e.issues ?? e.errors });
    next(e);
  }
});

router.patch('/:id', authorize('promocion.gestionar'), async (req, res, next) => {
  try {
    const parsed = updatePromoSchema.parse(req.body);
    const [actual] = await sequelize.query(`SELECT * FROM promocion WHERE id_promocion=:id`, { replacements: { id: req.params.id } });
    if (!actual[0]) return res.status(404).json({ error: 'Promoción no encontrada' });
    const vigente = actual[0];
    const effIni = parsed.fecha_inicio !== undefined ? parsed.fecha_inicio : vigente.fecha_inicio;
    const effFin = parsed.fecha_fin !== undefined ? parsed.fecha_fin : vigente.fecha_fin;
    if (effIni && effFin && new Date(effFin) < new Date(effIni)) {
      return res.status(400).json({ error: 'Validation failed', details: [{ message: 'fecha_fin debe ser >= fecha_inicio' }] });
    }
    const hoyUpd = new Date(); hoyUpd.setHours(0, 0, 0, 0);
    if (parsed.fecha_inicio && new Date(parsed.fecha_inicio) < hoyUpd) {
      return res.status(400).json({ error: 'Validation failed', details: [{ message: 'fecha_inicio no puede ser anterior a hoy' }] });
    }
    const effEstado = parsed.estado !== undefined ? parsed.estado : vigente.estado;
    let effProductoIds;
    if (parsed.producto_ids !== undefined) {
      effProductoIds = parsed.producto_ids;
    } else {
      const [pp] = await sequelize.query(`SELECT producto_id FROM promocion_producto WHERE promocion_id=:id`, { replacements: { id: req.params.id } });
      effProductoIds = pp.map((r) => r.producto_id);
    }
    if (effEstado === 'activa' && effProductoIds?.length) {
      const solape = await existeSolape({
        productoIds: effProductoIds,
        fechaInicio: effIni || null,
        fechaFin: effFin || null,
        excluirId: req.params.id,
      });
      if (solape) return res.status(409).json({ error: `El rango de fechas se solapa con otra promoción activa (${solape.nombre}) para los mismos productos` });
    }
    const sets = [];
    const repl = { id: req.params.id };
    if (parsed.nombre !== undefined) { sets.push('nombre=:nombre'); repl.nombre = parsed.nombre; }
    if (parsed.porcentaje_descuento !== undefined) { sets.push('porcentaje_descuento=:desc'); repl.desc = parsed.porcentaje_descuento; }
    if (parsed.fecha_inicio !== undefined) { sets.push('fecha_inicio=:ini'); repl.ini = parsed.fecha_inicio; }
    if (parsed.fecha_fin !== undefined) { sets.push('fecha_fin=:fin'); repl.fin = parsed.fecha_fin; }
    if (parsed.estado !== undefined) { sets.push('estado=:estado'); repl.estado = parsed.estado; }
    const t = await sequelize.transaction();
    let promo;
    try {
      if (sets.length > 0) {
        const [rows] = await sequelize.query(`UPDATE promocion SET ${sets.join(', ')} WHERE id_promocion=:id RETURNING *`, { replacements: repl, transaction: t });
        if (!rows[0]) { await t.rollback(); return res.status(404).json({ error: 'Promoción no encontrada' }); }
        promo = rows[0];
      } else {
        promo = vigente;
      }
      if (parsed.producto_ids !== undefined) {
        await sequelize.query(`DELETE FROM promocion_producto WHERE promocion_id=:id`, { replacements: { id: req.params.id }, transaction: t });
        for (const pid of parsed.producto_ids) {
          await sequelize.query(`INSERT INTO promocion_producto (promocion_id, producto_id) VALUES (:promo, :prod) ON CONFLICT DO NOTHING`, { replacements: { promo: req.params.id, prod: pid }, transaction: t });
        }
      }
      await t.commit();
    } catch (txErr) {
      try { await t.rollback(); } catch (_) { /* noop */ }
      throw txErr;
    }
    await auditLog({ usuario_id: req.user.id, accion: 'promocion.actualizar', entidad: 'promocion', entidad_id: req.params.id, resultado: 'exito', detalle: parsed, ip: req.ip, userAgent: req.headers['user-agent'] });
    res.json(promo);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: e.issues ?? e.errors });
    next(e);
  }
});

router.delete('/:id', authorize('promocion.gestionar'), async (req, res, next) => {
  try {
    const [rows] = await sequelize.query(
      `UPDATE promocion SET estado='inactiva' WHERE id_promocion=:id RETURNING *`,
      { replacements: { id: req.params.id } }
    );
    if (!rows[0]) return res.status(404).json({ error: 'Promoción no encontrada' });
    await auditLog({ usuario_id: req.user.id, accion: 'promocion.eliminar', entidad: 'promocion', entidad_id: req.params.id, resultado: 'exito', detalle: {}, ip: req.ip, userAgent: req.headers['user-agent'] });
    res.json({ ok: true, promocion: rows[0] });
  } catch (e) { next(e); }
});

module.exports = { promotionsRouter: router, createPromoSchema, updatePromoSchema };
