const { Router } = require('express');
const { authenticateJWT } = require('../middlewares/authenticate');
const { authorize } = require('../middlewares/authorize');
const { sequelize } = require('../config/database');
const { auditLog } = require('../utils/audit');
const { createCustomerSchema, updateCustomerSchema, uuidParamSchema, listQuerySchema, ajustePuntosSchema } = require('../validators/customer');

const router = Router();
router.use(authenticateJWT);

router.get('/', authorize('cliente.consultar'), async (req, res, next) => {
  try {
    const parsed = listQuerySchema.parse(req.query);
    const { q, estado, limit, offset } = parsed;
    const [rows] = await sequelize.query(
      `SELECT * FROM cliente WHERE (:q IS NULL OR nombre ILIKE :qlike OR correo ILIKE :qlike OR telefono ILIKE :qlike) AND (:estado IS NULL OR estado=:estado) ORDER BY creado_en DESC LIMIT :lim OFFSET :off`,
      { replacements: { q: q || null, qlike: q ? `%${q}%` : null, estado: estado || null, lim: limit, off: offset } }
    );
    res.json(rows);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: e.errors ?? e.issues });
    next(e);
  }
});

router.get('/:id/ventas', authorize('cliente.consultar'), async (req, res, next) => {
  try {
    try {
      uuidParamSchema.parse(req.params.id);
    } catch (e) {
      return res.status(400).json({ error: 'Validation failed', details: e.errors ?? e.issues });
    }
    const [crow] = await sequelize.query(`SELECT * FROM cliente WHERE id_cliente=:id`, { replacements: { id: req.params.id } });
    if (!crow[0]) return res.status(404).json({ error: 'Cliente no encontrado' });
    const [ventas] = await sequelize.query(
      `SELECT id_venta, total, estado, fecha FROM venta WHERE cliente_id=:id ORDER BY fecha DESC LIMIT 10`,
      { replacements: { id: req.params.id } }
    );
    res.json(ventas);
  } catch (e) { next(e); }
});

router.get('/:id', authorize('cliente.consultar'), async (req, res, next) => {
  try {
    try {
      uuidParamSchema.parse(req.params.id);
    } catch (e) {
      return res.status(400).json({ error: 'Validation failed', details: e.errors ?? e.issues });
    }
    const [rows] = await sequelize.query(`SELECT * FROM cliente WHERE id_cliente=:id`, { replacements: { id: req.params.id } });
    if (!rows[0]) return res.status(404).json({ error: 'Cliente no encontrado' });
    // incluir movimientos puntos recientes
    const [movs] = await sequelize.query(`SELECT * FROM movimiento_puntos WHERE cliente_id=:id ORDER BY fecha DESC LIMIT 20`, { replacements: { id: req.params.id } });
    res.json({ ...rows[0], movimientos_puntos: movs });
  } catch (e) { next(e); }
});

router.post('/', authorize('cliente.gestionar'), async (req, res, next) => {
  try {
    const parsed = createCustomerSchema.parse(req.body);
    const [rows] = await sequelize.query(
      `INSERT INTO cliente (nombre, telefono, correo, puntos_fidelidad, estado) VALUES (:nombre, :tel, :correo, :puntos, :estado) RETURNING *`,
      { replacements: { nombre: parsed.nombre, tel: parsed.telefono || null, correo: parsed.correo || null, puntos: 0, estado: parsed.estado } }
    );
    await auditLog({ usuario_id: req.user.id, accion: 'cliente.crear', entidad: 'cliente', entidad_id: rows[0].id_cliente, resultado: 'exito', detalle: parsed, ip: req.ip, userAgent: req.headers['user-agent'] });
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: e.errors ?? e.issues });
    if (e.code === '23505' || e.original?.code === '23505' || e.parent?.code === '23505') return res.status(409).json({ error: 'Correo o teléfono duplicado' });
    next(e);
  }
});

router.patch('/:id', authorize('cliente.gestionar'), async (req, res, next) => {
  try {
    try {
      uuidParamSchema.parse(req.params.id);
    } catch (e) {
      return res.status(400).json({ error: 'Validation failed', details: e.errors ?? e.issues });
    }
    if (req.body && Object.prototype.hasOwnProperty.call(req.body, 'puntos_fidelidad')) {
      return res.status(400).json({ error: 'Validation failed', details: [{ path: ['puntos_fidelidad'], message: 'puntos_fidelidad no editable' }] });
    }
    const parsed = updateCustomerSchema.parse(req.body);
    const sets = [];
    const repl = { id: req.params.id };
    if (parsed.nombre !== undefined) { sets.push('nombre=:nombre'); repl.nombre = parsed.nombre; }
    if (parsed.telefono !== undefined) { sets.push('telefono=:tel'); repl.tel = parsed.telefono; }
    if (parsed.correo !== undefined) { sets.push('correo=:correo'); repl.correo = parsed.correo; }
    if (parsed.estado !== undefined) { sets.push('estado=:estado'); repl.estado = parsed.estado; }
    const [rows] = await sequelize.query(`UPDATE cliente SET ${sets.join(', ')} WHERE id_cliente=:id RETURNING *`, { replacements: repl });
    if (!rows[0]) return res.status(404).json({ error: 'Cliente no encontrado' });
    await auditLog({ usuario_id: req.user.id, accion: 'cliente.actualizar', entidad: 'cliente', entidad_id: req.params.id, resultado: 'exito', detalle: parsed, ip: req.ip, userAgent: req.headers['user-agent'] });
    res.json(rows[0]);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: e.errors ?? e.issues });
    if (e.code === '23505' || e.original?.code === '23505' || e.parent?.code === '23505') return res.status(409).json({ error: 'Correo o teléfono duplicado' });
    next(e);
  }
});

router.post('/:id/ajustes-puntos', authorize('cliente.gestionar'), async (req, res, next) => {
  try {
    const id = req.params.id;
    try {
      uuidParamSchema.parse(id);
    } catch (e) {
      return res.status(400).json({ error: 'Validation failed', details: e.errors ?? e.issues });
    }
    let parsed;
    try {
      parsed = ajustePuntosSchema.parse(req.body);
    } catch (e) {
      return res.status(400).json({ error: 'Validation failed', details: e.errors ?? e.issues });
    }
    const { puntos, tipo, motivo } = parsed;
    const t = await sequelize.transaction();
    try {
      const [crow] = await sequelize.query(
        `SELECT id_cliente, puntos_fidelidad FROM cliente WHERE id_cliente=:id FOR UPDATE`,
        { replacements: { id }, transaction: t }
      );
      if (!crow[0]) {
        await t.rollback();
        return res.status(404).json({ error: 'Cliente no encontrado' });
      }
      const saldo = crow[0].puntos_fidelidad || 0;
      if (saldo + puntos < 0) {
        await t.rollback();
        return res.status(422).json({ error: 'Saldo insuficiente' });
      }
      const [mrows] = await sequelize.query(
        `INSERT INTO movimiento_puntos (cliente_id, puntos, tipo, motivo) VALUES (:id, :puntos, :tipo, :motivo) RETURNING *`,
        { replacements: { id, puntos, tipo, motivo }, transaction: t }
      );
      const [urows] = await sequelize.query(
        `UPDATE cliente SET puntos_fidelidad = puntos_fidelidad + :puntos WHERE id_cliente=:id RETURNING *`,
        { replacements: { id, puntos }, transaction: t }
      );
      await t.commit();
      await auditLog({ usuario_id: req.user.id, accion: 'cliente.ajuste_puntos', entidad: 'cliente', entidad_id: id, resultado: 'exito', detalle: { puntos, tipo, motivo }, ip: req.ip, userAgent: req.headers['user-agent'] });
      return res.status(201).json({ cliente: urows[0], movimiento: mrows[0] });
    } catch (e) {
      await t.rollback();
      throw e;
    }
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: e.errors ?? e.issues });
    next(e);
  }
});

module.exports = { customersRouter: router };
