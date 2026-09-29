const { Router } = require('express');
const { authenticateJWT } = require('../middlewares/authenticate');
const { authorize } = require('../middlewares/authorize');
const { createProductSchema, updateProductSchema } = require('../validators/product');
const { canInactivateProduct, isStockBajo } = require('../services/productoService');
const { sequelize } = require('../config/database');
const { auditLog } = require('../utils/audit');

const router = Router();
router.use(authenticateJWT);
router.get('/', authorize('producto.consultar'), async (_req, res) => {
  const [rows] = await sequelize.query(`SELECT p.*, c.nombre as categoria FROM producto p LEFT JOIN categoria c ON c.id_categoria=p.categoria_id WHERE p.estado='activo' ORDER BY p.nombre`);
  res.json(rows);
});
router.post('/', authorize('producto.gestionar'), async (req, res, next) => {
  try {
    const parsed = createProductSchema.parse(req.body);
    const [rows] = await sequelize.query(`INSERT INTO producto (categoria_id, nombre, precio, stock, stock_minimo) VALUES (:cat, :nom, :pre, :stock, :min) RETURNING *`, { replacements: { cat: parsed.categoria_id || null, nom: parsed.nombre, pre: parsed.precio, stock: parsed.stock ?? 0, min: parsed.stock_minimo ?? 0 } });
    await auditLog({ usuario_id: req.user.id, accion: 'producto.crear', entidad: 'producto', entidad_id: rows[0].id_producto, resultado: 'exito', detalle: parsed, ip: req.ip, userAgent: req.headers['user-agent'] });
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: e.errors });
    next(e);
  }
});
router.get('/:id', authorize('producto.consultar'), async (req, res, next) => {
  try {
    const [rows] = await sequelize.query(`SELECT p.*, c.nombre as categoria FROM producto p LEFT JOIN categoria c ON c.id_categoria=p.categoria_id WHERE p.id_producto=:id`, { replacements: { id: req.params.id } });
    if (!rows[0]) return res.status(404).json({ error: 'Producto no encontrado' });
    const p = rows[0];
    res.json({ ...p, stock_bajo: isStockBajo({ stock: p.stock, stock_minimo: p.stock_minimo }) });
  } catch (e) { next(e); }
});
router.patch('/:id', authorize('producto.gestionar'), async (req, res, next) => {
  try {
    const parsed = updateProductSchema.parse(req.body);
    const sets = [];
    const repl = { id: req.params.id };
    if (parsed.categoria_id !== undefined) { sets.push('categoria_id=:cat'); repl.cat = parsed.categoria_id; }
    if (parsed.nombre !== undefined) { sets.push('nombre=:nom'); repl.nom = parsed.nombre; }
    if (parsed.precio !== undefined) { sets.push('precio=:pre'); repl.pre = parsed.precio; }
    if (parsed.stock !== undefined) { sets.push('stock=:stock'); repl.stock = parsed.stock; }
    if (parsed.stock_minimo !== undefined) { sets.push('stock_minimo=:min'); repl.min = parsed.stock_minimo; }
    if (parsed.estado !== undefined) { sets.push('estado=:estado'); repl.estado = parsed.estado; }
    if (sets.length === 0) return res.status(400).json({ error: 'Nada para actualizar' });
    const [rows] = await sequelize.query(`UPDATE producto SET ${sets.join(', ')} WHERE id_producto=:id RETURNING *`, { replacements: repl });
    if (!rows[0]) return res.status(404).json({ error: 'Producto no encontrado' });
    await auditLog({ usuario_id: req.user.id, accion: 'producto.actualizar', entidad: 'producto', entidad_id: req.params.id, resultado: 'exito', detalle: parsed, ip: req.ip, userAgent: req.headers['user-agent'] });
    res.json(rows[0]);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: e.errors });
    next(e);
  }
});
router.delete('/:id', authorize('producto.gestionar'), async (req, res, next) => {
  try {
    const [deps] = await sequelize.query(`SELECT COUNT(*)::int as n FROM detalle_venta WHERE producto_id=:id`, { replacements: { id: req.params.id } });
    if (!canInactivateProduct({ detalleCount: deps[0]?.n || 0 })) {
      return res.status(409).json({ error: 'No se puede inactivar: tiene ventas asociadas' });
    }
    const [rows] = await sequelize.query(`UPDATE producto SET estado='inactivo' WHERE id_producto=:id RETURNING *`, { replacements: { id: req.params.id } });
    if (!rows[0]) return res.status(404).json({ error: 'Producto no encontrado' });
    await auditLog({ usuario_id: req.user.id, accion: 'producto.inactivar', entidad: 'producto', entidad_id: req.params.id, resultado: 'exito', detalle: {}, ip: req.ip, userAgent: req.headers['user-agent'] });
    res.json(rows[0]);
  } catch (e) { next(e); }
});
module.exports = { productsRouter: router };
