const { Router } = require('express');
const { authenticateJWT } = require('../middlewares/authenticate');
const { authorize } = require('../middlewares/authorize');
const { createSupplierSchema, updateSupplierSchema, uuidParamSchema } = require('../validators/supplier');
const { uniqueViolationTarget } = require('../utils/dbErrors');
const { sequelize } = require('../config/database');
const { auditLog } = require('../utils/audit');

const router = Router();
router.use(authenticateJWT);

router.get('/', authorize('inventario.consultar'), async (_req, res, next) => {
  try {
    const [rows] = await sequelize.query(`SELECT * FROM proveedor ORDER BY nombre LIMIT 100`);
    res.json(rows);
  } catch (e) { next(e); }
});

router.get('/:id', authorize('inventario.consultar'), async (req, res, next) => {
  try {
    try {
      uuidParamSchema.parse(req.params.id);
    } catch (e) {
      return res.status(400).json({ error: 'Validation failed', details: e.errors ?? e.issues });
    }
    const [rows] = await sequelize.query(`SELECT * FROM proveedor WHERE id_proveedor=:id`, { replacements: { id: req.params.id } });
    if (!rows[0]) return res.status(404).json({ error: 'Proveedor no encontrado' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

router.post('/', authorize('inventario.movimiento'), async (req, res, next) => {
  try {
    const parsed = createSupplierSchema.parse(req.body);
    const [rows] = await sequelize.query(
      `INSERT INTO proveedor (nombre, nit, contacto, telefono, correo, estado)
       VALUES (:nom, :nit, :con, :tel, :correo, :estado) RETURNING *`,
      { replacements: { nom: parsed.nombre, nit: parsed.nit || null, con: parsed.contacto || null, tel: parsed.telefono || null, correo: parsed.correo || null, estado: parsed.estado } }
    );
    await auditLog({ usuario_id: req.user.id, accion: 'proveedor.crear', entidad: 'proveedor', entidad_id: rows[0].id_proveedor, resultado: 'exito', detalle: parsed, ip: req.ip, userAgent: req.headers['user-agent'] });
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: e.errors });
    const duplicado = uniqueViolationTarget(e);
    if (duplicado === 'correo') return res.status(409).json({ error: 'Correo duplicado' });
    if (duplicado === 'nit') return res.status(409).json({ error: 'NIT duplicado' });
    if (duplicado) return res.status(409).json({ error: 'Valor duplicado' });
    next(e);
  }
});

router.patch('/:id', authorize('inventario.movimiento'), async (req, res, next) => {
  try {
    try {
      uuidParamSchema.parse(req.params.id);
    } catch (e) {
      return res.status(400).json({ error: 'Validation failed', details: e.errors ?? e.issues });
    }
    const parsed = updateSupplierSchema.parse(req.body);
    const sets = [];
    const repl = { id: req.params.id };
    if (parsed.nombre !== undefined) { sets.push('nombre=:nom'); repl.nom = parsed.nombre; }
    if (parsed.nit !== undefined) { sets.push('nit=:nit'); repl.nit = parsed.nit; }
    if (parsed.contacto !== undefined) { sets.push('contacto=:con'); repl.con = parsed.contacto; }
    if (parsed.telefono !== undefined) { sets.push('telefono=:tel'); repl.tel = parsed.telefono; }
    if (parsed.correo !== undefined) { sets.push('correo=:correo'); repl.correo = parsed.correo; }
    if (parsed.estado !== undefined) { sets.push('estado=:estado'); repl.estado = parsed.estado; }
    const [rows] = await sequelize.query(`UPDATE proveedor SET ${sets.join(', ')} WHERE id_proveedor=:id RETURNING *`, { replacements: repl });
    if (!rows[0]) return res.status(404).json({ error: 'Proveedor no encontrado' });
    await auditLog({ usuario_id: req.user.id, accion: 'proveedor.actualizar', entidad: 'proveedor', entidad_id: req.params.id, resultado: 'exito', detalle: parsed, ip: req.ip, userAgent: req.headers['user-agent'] });
    res.json(rows[0]);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: e.errors });
    const duplicado = uniqueViolationTarget(e);
    if (duplicado === 'correo') return res.status(409).json({ error: 'Correo duplicado' });
    if (duplicado === 'nit') return res.status(409).json({ error: 'NIT duplicado' });
    if (duplicado) return res.status(409).json({ error: 'Valor duplicado' });
    next(e);
  }
});

router.delete('/:id', authorize('inventario.movimiento'), async (req, res, next) => {
  try {
    try {
      uuidParamSchema.parse(req.params.id);
    } catch (e) {
      return res.status(400).json({ error: 'Validation failed', details: e.errors ?? e.issues });
    }
    const definitivo = req.query.definitivo === 'true';
    if (definitivo) {
      const [found] = await sequelize.query(`SELECT * FROM proveedor WHERE id_proveedor=:id`, { replacements: { id: req.params.id } });
      if (!found[0]) return res.status(404).json({ error: 'Proveedor no encontrado' });
      if (found[0].estado !== 'inactivo') {
        return res.status(409).json({ error: 'Debe inactivar al proveedor antes de eliminarlo', code: 'PROVEEDOR_ACTIVO' });
      }
      const [countRows] = await sequelize.query(
        `SELECT COUNT(*)::int AS total FROM movimiento_inventario WHERE proveedor_id=:id`,
        { replacements: { id: req.params.id } }
      );
      const total = parseInt(countRows[0]?.total ?? countRows[0]?.count ?? 0, 10) || 0;
      if (total > 0) {
        return res.status(409).json({ error: 'No se puede eliminar: tiene movimientos de inventario asociados', code: 'PROVEEDOR_CON_HISTORIAL' });
      }
      try {
        const [deleted] = await sequelize.query(`DELETE FROM proveedor WHERE id_proveedor=:id RETURNING *`, { replacements: { id: req.params.id } });
        if (!deleted[0]) return res.status(404).json({ error: 'Proveedor no encontrado' });
        await auditLog({ usuario_id: req.user.id, accion: 'proveedor.eliminar', entidad: 'proveedor', entidad_id: req.params.id, resultado: 'exito', detalle: { nombre: found[0].nombre }, ip: req.ip, userAgent: req.headers['user-agent'] });
        return res.json(deleted[0]);
      } catch (e) {
        if (e?.code === '23503' || e?.original?.code === '23503' || e?.parent?.code === '23503') {
          return res.status(409).json({ error: 'No se puede eliminar: tiene movimientos de inventario asociados', code: 'PROVEEDOR_CON_HISTORIAL' });
        }
        throw e;
      }
    }
    const [rows] = await sequelize.query(`UPDATE proveedor SET estado='inactivo' WHERE id_proveedor=:id RETURNING *`, { replacements: { id: req.params.id } });
    if (!rows[0]) return res.status(404).json({ error: 'Proveedor no encontrado' });
    await auditLog({ usuario_id: req.user.id, accion: 'proveedor.inactivar', entidad: 'proveedor', entidad_id: req.params.id, resultado: 'exito', detalle: {}, ip: req.ip, userAgent: req.headers['user-agent'] });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

module.exports = { suppliersRouter: router };
