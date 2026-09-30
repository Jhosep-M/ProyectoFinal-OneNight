const { Router } = require('express');
const { authenticateJWT } = require('../middlewares/authenticate');
const { authorize } = require('../middlewares/authorize');
const { sequelize } = require('../config/database');
const { auditLog } = require('../utils/audit');
const {
  createRecipeSchema,
  updateRecipeSchema,
  uuidParamSchema,
  listRecipeQuerySchema,
} = require('../validators/recipe');

const router = Router();
router.use(authenticateJWT);

const SELECT_LINEAS = `
  SELECT r.*, i.nombre AS insumo_nombre, i.unidad_medida, i.stock
  FROM receta_insumo r
  LEFT JOIN insumo i ON i.id_insumo = r.insumo_id
`;

router.get('/', authorize('producto.consultar'), async (req, res, next) => {
  try {
    const parsed = listRecipeQuerySchema.parse(req.query);
    if (parsed.producto_id) {
      const [rows] = await sequelize.query(
        `${SELECT_LINEAS} WHERE r.producto_id = :pid ORDER BY i.nombre`,
        { replacements: { pid: parsed.producto_id } }
      );
      return res.json(rows);
    }
    const [rows] = await sequelize.query(
      `${SELECT_LINEAS} ORDER BY i.nombre LIMIT 100`
    );
    return res.json(rows);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: e.errors ?? e.issues });
    return next(e);
  }
});

router.post('/', authorize('producto.gestionar'), async (req, res, next) => {
  try {
    const parsed = createRecipeSchema.parse(req.body);
    const [prod] = await sequelize.query(`SELECT 1 FROM producto WHERE id_producto = :id`, { replacements: { id: parsed.producto_id } });
    if (!prod[0]) return res.status(404).json({ error: 'Producto no encontrado' });
    const [ins] = await sequelize.query(`SELECT 1 FROM insumo WHERE id_insumo = :id`, { replacements: { id: parsed.insumo_id } });
    if (!ins[0]) return res.status(404).json({ error: 'Insumo no encontrado' });
    const [rows] = await sequelize.query(
      `INSERT INTO receta_insumo (producto_id, insumo_id, cantidad_requerida) VALUES (:pid, :iid, :cant) RETURNING *`,
      { replacements: { pid: parsed.producto_id, iid: parsed.insumo_id, cant: parsed.cantidad_requerida } }
    );
    await auditLog({ usuario_id: req.user.id, accion: 'receta.crear', entidad: 'receta_insumo', entidad_id: rows[0].id_receta, resultado: 'exito', detalle: parsed, ip: req.ip, userAgent: req.headers['user-agent'] });
    return res.status(201).json(rows[0]);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: e.errors ?? e.issues });
    if (e.code === '23505' || e.original?.code === '23505' || e.parent?.code === '23505') {
      return res.status(409).json({ error: 'Ese insumo ya está en la receta' });
    }
    return next(e);
  }
});

router.patch('/:id', authorize('producto.gestionar'), async (req, res, next) => {
  try {
    try {
      uuidParamSchema.parse(req.params.id);
    } catch (e) {
      return res.status(400).json({ error: 'Validation failed', details: e.errors ?? e.issues });
    }
    const parsed = updateRecipeSchema.parse(req.body);
    const sets = [];
    const repl = { id: req.params.id };
    if (parsed.cantidad_requerida !== undefined) { sets.push('cantidad_requerida = :cant'); repl.cant = parsed.cantidad_requerida; }
    if (sets.length === 0) return res.status(400).json({ error: 'Nada para actualizar' });
    const [rows] = await sequelize.query(
      `UPDATE receta_insumo SET ${sets.join(', ')} WHERE id_receta = :id RETURNING *`,
      { replacements: repl }
    );
    if (!rows[0]) return res.status(404).json({ error: 'Receta no encontrada' });
    await auditLog({ usuario_id: req.user.id, accion: 'receta.actualizar', entidad: 'receta_insumo', entidad_id: req.params.id, resultado: 'exito', detalle: parsed, ip: req.ip, userAgent: req.headers['user-agent'] });
    return res.json(rows[0]);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: e.errors ?? e.issues });
    return next(e);
  }
});

router.delete('/:id', authorize('producto.gestionar'), async (req, res, next) => {
  try {
    try {
      uuidParamSchema.parse(req.params.id);
    } catch (e) {
      return res.status(400).json({ error: 'Validation failed', details: e.errors ?? e.issues });
    }
    const [rows] = await sequelize.query(
      `DELETE FROM receta_insumo WHERE id_receta = :id RETURNING *`,
      { replacements: { id: req.params.id } }
    );
    if (!rows[0]) return res.status(404).json({ error: 'Receta no encontrada' });
    await auditLog({ usuario_id: req.user.id, accion: 'receta.eliminar', entidad: 'receta_insumo', entidad_id: req.params.id, resultado: 'exito', detalle: {}, ip: req.ip, userAgent: req.headers['user-agent'] });
    return res.json({ eliminado: true, id_receta: req.params.id });
  } catch (e) {
    return next(e);
  }
});

module.exports = { recipesRouter: router };
