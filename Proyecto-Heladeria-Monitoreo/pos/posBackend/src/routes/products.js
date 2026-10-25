const { Router } = require('express');
const { authenticateJWT } = require('../middlewares/authenticate');
const { authorize } = require('../middlewares/authorize');
const { createProductSchema, updateProductSchema } = require('../validators/product');
const { canInactivateProduct, isStockBajo } = require('../services/productoService');
const { sequelize } = require('../config/database');
const { auditLog } = require('../utils/audit');
const { isUniqueViolation } = require('../utils/dbErrors');

const DUPLICADO_MSG = 'Ya existe un producto con ese nombre en la categoría';
const SIN_CATEGORIA = '00000000-0000-0000-0000-000000000000';

// true si ya hay otro producto ACTIVO con misma categoria + nombre
// (case-insensitive, trim). categoria_id NULL = bolsa "sin categoria".
async function existeDuplicado({ categoria_id, nombre, excluirId = null }) {
  const [rows] = await sequelize.query(
    `SELECT id_producto FROM producto WHERE estado='activo'
      AND COALESCE(categoria_id, :sinCat::uuid) = COALESCE(:cat::uuid, :sinCat::uuid)
      AND lower(trim(nombre)) = lower(trim(:nom))
      AND (:excluir::uuid IS NULL OR id_producto <> :excluir::uuid)
      LIMIT 1`,
    { replacements: { cat: categoria_id || null, nom: nombre, excluir: excluirId, sinCat: SIN_CATEGORIA } }
  );
  return !!rows[0];
}

const router = Router();
router.use(authenticateJWT);
router.get('/', authorize('producto.consultar'), async (_req, res) => {
  const [rows] = await sequelize.query(`SELECT p.*, c.nombre as categoria FROM producto p LEFT JOIN categoria c ON c.id_categoria=p.categoria_id WHERE p.estado='activo' ORDER BY p.nombre`);
  res.json(rows);
});
router.post('/', authorize('producto.gestionar'), async (req, res, next) => {
  try {
    const parsed = createProductSchema.parse(req.body);
    if (await existeDuplicado({ categoria_id: parsed.categoria_id || null, nombre: parsed.nombre })) {
      return res.status(409).json({ error: DUPLICADO_MSG });
    }
    const [rows] = await sequelize.query(`INSERT INTO producto (categoria_id, nombre, precio, imagen_url, stock, stock_minimo) VALUES (:cat, :nom, :pre, :img, :stock, :min) RETURNING *`, { replacements: { cat: parsed.categoria_id || null, nom: parsed.nombre, pre: parsed.precio, img: parsed.imagen_url || null, stock: parsed.stock ?? 0, min: parsed.stock_minimo ?? 0 } });
    await auditLog({ usuario_id: req.user.id, accion: 'producto.crear', entidad: 'producto', entidad_id: rows[0].id_producto, resultado: 'exito', detalle: parsed, ip: req.ip, userAgent: req.headers['user-agent'] });
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: e.errors });
    if (isUniqueViolation(e)) return res.status(409).json({ error: DUPLICADO_MSG });
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
    if (parsed.nombre !== undefined || parsed.categoria_id !== undefined) {
      const [actual] = await sequelize.query(`SELECT nombre, categoria_id FROM producto WHERE id_producto=:id`, { replacements: { id: req.params.id } });
      if (!actual[0]) return res.status(404).json({ error: 'Producto no encontrado' });
      const nombreEf = parsed.nombre !== undefined ? parsed.nombre : actual[0].nombre;
      const catEf = parsed.categoria_id !== undefined ? parsed.categoria_id : actual[0].categoria_id;
      if (await existeDuplicado({ categoria_id: catEf || null, nombre: nombreEf, excluirId: req.params.id })) {
        return res.status(409).json({ error: DUPLICADO_MSG });
      }
    }
    const sets = [];
    const repl = { id: req.params.id };
    if (parsed.categoria_id !== undefined) { sets.push('categoria_id=:cat'); repl.cat = parsed.categoria_id; }
    if (parsed.nombre !== undefined) { sets.push('nombre=:nom'); repl.nom = parsed.nombre; }
    if (parsed.precio !== undefined) { sets.push('precio=:pre'); repl.pre = parsed.precio; }
    if (parsed.imagen_url !== undefined) { sets.push('imagen_url=:img'); repl.img = parsed.imagen_url; }
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
    if (isUniqueViolation(e)) return res.status(409).json({ error: DUPLICADO_MSG });
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
