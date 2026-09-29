const { Router } = require('express');
const { authenticateJWT } = require('../middlewares/authenticate');
const { authorize } = require('../middlewares/authorize');
const { createInsumoSchema, updateInsumoSchema, createMovimientoInventarioSchema } = require('../validators/inventory');
const { registrarMovimiento } = require('../services/inventarioService');
const { sequelize } = require('../config/database');
const { auditLog } = require('../utils/audit');

const router = Router();
router.use(authenticateJWT);

// GET /api/v1/inventory -> lista insumos (inventario.consultar)
router.get('/', authorize('inventario.consultar'), async (_req, res, next) => {
  try {
    const [rows] = await sequelize.query(`SELECT * FROM insumo ORDER BY nombre LIMIT 100`);
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /api/v1/inventory/insumos
router.get('/insumos', authorize('inventario.consultar'), async (_req, res, next) => {
  try {
    const [rows] = await sequelize.query(`SELECT * FROM insumo ORDER BY nombre`);
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /api/v1/inventory/insumos/:id
router.get('/insumos/:id', authorize('inventario.consultar'), async (req, res, next) => {
  try {
    const [rows] = await sequelize.query(`SELECT * FROM insumo WHERE id_insumo=:id`, { replacements: { id: req.params.id } });
    if (!rows[0]) return res.status(404).json({ error: 'Insumo no encontrado' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

// POST /api/v1/inventory/insumos -> inventario.movimiento (spec: POST usa inventario.movimiento)
router.post('/insumos', authorize('inventario.movimiento'), async (req, res, next) => {
  try {
    const parsed = createInsumoSchema.parse(req.body);
    const [rows] = await sequelize.query(
      `INSERT INTO insumo (nombre, unidad_medida, stock, stock_minimo, fecha_vencimiento, estado) VALUES (:nombre, :um, :stock, :min, :fv, :estado) RETURNING *`,
      { replacements: { nombre: parsed.nombre, um: parsed.unidad_medida, stock: parsed.stock ?? 0, min: parsed.stock_minimo ?? 0, fv: parsed.fecha_vencimiento || null, estado: parsed.estado } }
    );
    await auditLog({ usuario_id: req.user.id, accion: 'insumo.crear', entidad: 'insumo', entidad_id: rows[0].id_insumo, resultado: 'exito', detalle: parsed, ip: req.ip, userAgent: req.headers['user-agent'] });
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: e.errors });
    next(e);
  }
});

// PATCH /api/v1/inventory/insumos/:id
router.patch('/insumos/:id', authorize('inventario.movimiento'), async (req, res, next) => {
  try {
    const parsed = updateInsumoSchema.parse(req.body);
    const sets = [];
    const repl = { id: req.params.id };
    if (parsed.nombre !== undefined) { sets.push('nombre=:nombre'); repl.nombre = parsed.nombre; }
    if (parsed.unidad_medida !== undefined) { sets.push('unidad_medida=:um'); repl.um = parsed.unidad_medida; }
    if (parsed.stock !== undefined) { sets.push('stock=:stock'); repl.stock = parsed.stock; }
    if (parsed.stock_minimo !== undefined) { sets.push('stock_minimo=:min'); repl.min = parsed.stock_minimo; }
    if (parsed.fecha_vencimiento !== undefined) { sets.push('fecha_vencimiento=:fv'); repl.fv = parsed.fecha_vencimiento; }
    if (parsed.estado !== undefined) { sets.push('estado=:estado'); repl.estado = parsed.estado; }
    if (parsed.proveedor_id !== undefined) { sets.push('proveedor_id=:prov'); repl.prov = parsed.proveedor_id; }
    const [rows] = await sequelize.query(`UPDATE insumo SET ${sets.join(', ')} WHERE id_insumo=:id RETURNING *`, { replacements: repl });
    if (!rows[0]) return res.status(404).json({ error: 'Insumo no encontrado' });
    res.json(rows[0]);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: e.errors });
    next(e);
  }
});

// GET /api/v1/inventory/movimientos
router.get('/movimientos', authorize('inventario.consultar'), async (_req, res, next) => {
  try {
    const [rows] = await sequelize.query(`SELECT * FROM movimiento_inventario ORDER BY fecha DESC LIMIT 100`);
    res.json(rows);
  } catch (e) { next(e); }
});

// POST /api/v1/inventory/movimientos -> inventario.movimiento (actualiza stock en transaccion)
router.post('/movimientos', authorize('inventario.movimiento'), async (req, res, next) => {
  try {
    const parsed = createMovimientoInventarioSchema.parse(req.body);
    if (!['ingreso', 'salida', 'ajuste'].includes(parsed.tipo)) {
      return res.status(400).json({ error: 'tipo debe ser ingreso|salida|ajuste' });
    }
    const out = await registrarMovimiento({
      insumo_id: parsed.insumo_id || null,
      producto_id: parsed.producto_id || null,
      proveedor_id: parsed.proveedor_id || null,
      usuarioId: req.user.id,
      tipo: parsed.tipo,
      cantidad: parsed.cantidad,
      motivo: parsed.motivo || null,
    });
    await auditLog({ usuario_id: req.user.id, accion: 'inventario.movimiento', entidad: 'movimiento_inventario', entidad_id: out.movimiento.id_movimiento, resultado: 'exito', detalle: parsed, ip: req.ip, userAgent: req.headers['user-agent'] });
    res.status(201).json(out.movimiento);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: e.errors });
    if (/STOCK_NEGATIVO/.test(e.message)) return res.status(409).json({ error: 'Stock insuficiente' });
    if (/no encontrado/i.test(e.message)) return res.status(404).json({ error: 'Insumo/producto no encontrado' });
    next(e);
  }
});

module.exports = { inventoryRouter: router };
