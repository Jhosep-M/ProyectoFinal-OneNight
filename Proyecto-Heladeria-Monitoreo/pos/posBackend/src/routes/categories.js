const { Router } = require('express');
const { authenticateJWT } = require('../middlewares/authenticate');
const { authorize } = require('../middlewares/authorize');
const { createCategorySchema, updateCategorySchema } = require('../validators/category');
const { canInactivateCategory } = require('../services/productoService');
const { isUniqueViolation } = require('../utils/dbErrors');
const { sequelize } = require('../config/database');
const { auditLog } = require('../utils/audit');

const router = Router();
router.use(authenticateJWT);

router.get('/', authorize('producto.consultar'), async (_req, res, next) => {
  try {
    const [rows] = await sequelize.query(`SELECT * FROM categoria ORDER BY nombre LIMIT 100`);
    res.json(rows);
  } catch (e) { next(e); }
});

router.get('/:id', authorize('producto.consultar'), async (req, res, next) => {
  try {
    const [rows] = await sequelize.query(`SELECT * FROM categoria WHERE id_categoria=:id`, { replacements: { id: req.params.id } });
    if (!rows[0]) return res.status(404).json({ error: 'Categoria no encontrada' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

router.post('/', authorize('producto.gestionar'), async (req, res, next) => {
  try {
    const parsed = createCategorySchema.parse(req.body);
    const [rows] = await sequelize.query(
      `INSERT INTO categoria (nombre, estado) VALUES (:nom, :estado) RETURNING *`,
      { replacements: { nom: parsed.nombre, estado: parsed.estado } }
    );
    await auditLog({ usuario_id: req.user.id, accion: 'categoria.crear', entidad: 'categoria', entidad_id: rows[0].id_categoria, resultado: 'exito', detalle: parsed, ip: req.ip, userAgent: req.headers['user-agent'] });
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: e.errors });
    if (isUniqueViolation(e)) {
      return res.status(409).json({ error: 'Nombre de categoria duplicado' });
    }
    next(e);
  }
});

router.patch('/:id', authorize('producto.gestionar'), async (req, res, next) => {
  try {
    const parsed = updateCategorySchema.parse(req.body);
    const sets = [];
    const repl = { id: req.params.id };
    if (parsed.nombre !== undefined) { sets.push('nombre=:nom'); repl.nom = parsed.nombre; }
    if (parsed.estado !== undefined) { sets.push('estado=:estado'); repl.estado = parsed.estado; }
    const [rows] = await sequelize.query(`UPDATE categoria SET ${sets.join(', ')} WHERE id_categoria=:id RETURNING *`, { replacements: repl });
    if (!rows[0]) return res.status(404).json({ error: 'Categoria no encontrada' });
    await auditLog({ usuario_id: req.user.id, accion: 'categoria.actualizar', entidad: 'categoria', entidad_id: req.params.id, resultado: 'exito', detalle: parsed, ip: req.ip, userAgent: req.headers['user-agent'] });
    res.json(rows[0]);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: e.errors });
    if (isUniqueViolation(e)) {
      return res.status(409).json({ error: 'Nombre de categoria duplicado' });
    }
    next(e);
  }
});

router.delete('/:id', authorize('producto.gestionar'), async (req, res, next) => {
  try {
    const [deps] = await sequelize.query(`SELECT COUNT(*)::int as n FROM producto WHERE categoria_id=:id`, { replacements: { id: req.params.id } });
    if (!canInactivateCategory({ productCount: deps[0]?.n || 0 })) {
      return res.status(409).json({ error: 'No se puede inactivar: tiene productos asociados' });
    }
    const [rows] = await sequelize.query(`UPDATE categoria SET estado='inactivo' WHERE id_categoria=:id RETURNING *`, { replacements: { id: req.params.id } });
    if (!rows[0]) return res.status(404).json({ error: 'Categoria no encontrada' });
    await auditLog({ usuario_id: req.user.id, accion: 'categoria.inactivar', entidad: 'categoria', entidad_id: req.params.id, resultado: 'exito', detalle: {}, ip: req.ip, userAgent: req.headers['user-agent'] });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

module.exports = { categoriesRouter: router };
