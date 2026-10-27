const { Router } = require('express');
const { authenticateJWT } = require('../middlewares/authenticate');
const { authorize, authorizeAny } = require('../middlewares/authorize');
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

function pgCode(e) {
  return e?.code || e?.original?.code || e?.parent?.code;
}
function pgConstraint(e) {
  return e?.constraint || e?.original?.constraint || e?.parent?.constraint || '';
}
function dup409(e, fallbackFields) {
  const c = String(pgConstraint(e)).toLowerCase();
  const esTelefono = c.includes('telefono');
  if (esTelefono) return { error: 'Teléfono duplicado', fields: { telefono: 'Teléfono ya registrado' } };
  return { error: 'Correo duplicado', fields: fallbackFields || { correo: 'Correo ya registrado' } };
}

router.post('/', authorizeAny(['cliente.crear', 'cliente.gestionar']), async (req, res, next) => {
  try {
    const parsed = createCustomerSchema.parse(req.body);
    const nombre = parsed.nombre.trim();
    const tel = parsed.telefono.trim();
    const correo = parsed.correo.trim().toLowerCase();
    // Pre-chequeo amable: correo y telefono unicos (nombre puede repetirse)
    const [dup] = await sequelize.query(
      `SELECT id_cliente, correo, telefono FROM cliente WHERE lower(correo)=lower(:correo) OR telefono=:tel LIMIT 1`,
      { replacements: { correo, tel } }
    );
    if (dup[0]) {
      const fields = {};
      if (dup[0].correo && String(dup[0].correo).toLowerCase() === correo.toLowerCase()) fields.correo = 'Correo ya registrado';
      if (dup[0].telefono && String(dup[0].telefono) === tel) fields.telefono = 'Teléfono ya registrado';
      const primero = fields.correo ? 'Correo duplicado' : 'Teléfono duplicado';
      return res.status(409).json({ error: primero, fields });
    }
    const [rows] = await sequelize.query(
      `INSERT INTO cliente (nombre, telefono, correo, puntos_fidelidad, estado) VALUES (:nombre, :tel, :correo, :puntos, :estado) RETURNING *`,
      { replacements: { nombre, tel, correo, puntos: 0, estado: parsed.estado } }
    );
    await auditLog({ usuario_id: req.user.id, accion: 'cliente.crear', entidad: 'cliente', entidad_id: rows[0].id_cliente, resultado: 'exito', detalle: { nombre, telefono: tel, correo, estado: parsed.estado }, ip: req.ip, userAgent: req.headers['user-agent'] });
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: e.errors ?? e.issues });
    if (pgCode(e) === '23505') { const d = dup409(e); return res.status(409).json(d); }
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
    const nombre = parsed.nombre !== undefined ? parsed.nombre.trim() : undefined;
    const tel = parsed.telefono !== undefined ? parsed.telefono.trim() : undefined;
    const correo = parsed.correo !== undefined ? parsed.correo.trim().toLowerCase() : undefined;
    // Pre-chequeo de duplicados excluyendo al propio cliente
    if (correo !== undefined || tel !== undefined) {
      const conds = [];
      if (correo !== undefined) conds.push('lower(correo)=lower(:correo)');
      if (tel !== undefined) conds.push('telefono=:tel');
      const [dup] = await sequelize.query(
        `SELECT id_cliente, correo, telefono FROM cliente WHERE (${conds.join(' OR ')}) AND id_cliente<>:id LIMIT 1`,
        { replacements: { correo: correo ?? '', tel: tel ?? '', id: req.params.id } }
      );
      if (dup[0]) {
        const fields = {};
        if (correo !== undefined && dup[0].correo && String(dup[0].correo).toLowerCase() === correo.toLowerCase()) fields.correo = 'Correo ya registrado';
        if (tel !== undefined && dup[0].telefono && String(dup[0].telefono) === tel) fields.telefono = 'Teléfono ya registrado';
        const primero = fields.correo ? 'Correo duplicado' : 'Teléfono duplicado';
        return res.status(409).json({ error: primero, fields });
      }
    }
    const sets = [];
    const repl = { id: req.params.id };
    if (nombre !== undefined) { sets.push('nombre=:nombre'); repl.nombre = nombre; }
    if (tel !== undefined) { sets.push('telefono=:tel'); repl.tel = tel; }
    if (correo !== undefined) { sets.push('correo=:correo'); repl.correo = correo; }
    if (parsed.estado !== undefined) { sets.push('estado=:estado'); repl.estado = parsed.estado; }
    const [rows] = await sequelize.query(`UPDATE cliente SET ${sets.join(', ')} WHERE id_cliente=:id RETURNING *`, { replacements: repl });
    if (!rows[0]) return res.status(404).json({ error: 'Cliente no encontrado' });
    await auditLog({ usuario_id: req.user.id, accion: 'cliente.actualizar', entidad: 'cliente', entidad_id: req.params.id, resultado: 'exito', detalle: { nombre, telefono: tel, correo, estado: parsed.estado }, ip: req.ip, userAgent: req.headers['user-agent'] });
    res.json(rows[0]);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: e.errors ?? e.issues });
    if (pgCode(e) === '23505') { const d = dup409(e); return res.status(409).json(d); }
    next(e);
  }
});

router.delete('/:id', authorize('cliente.gestionar'), async (req, res, next) => {
  try {
    try {
      uuidParamSchema.parse(req.params.id);
    } catch (e) {
      return res.status(400).json({ error: 'Validation failed', details: e.errors ?? e.issues });
    }
    const id = req.params.id;
    const [exists] = await sequelize.query(
      `SELECT id_cliente, nombre, correo FROM cliente WHERE id_cliente=:id`,
      { replacements: { id } }
    );
    if (!exists[0]) return res.status(404).json({ error: 'Cliente no encontrado' });
    const [ventas] = await sequelize.query(
      `SELECT COUNT(*)::int AS total FROM venta WHERE cliente_id=:id`,
      { replacements: { id } }
    );
    if (Number(ventas[0]?.total ?? 0) > 0) {
      await auditLog({ usuario_id: req.user.id, accion: 'cliente.eliminar_bloqueado', entidad: 'cliente', entidad_id: id, resultado: 'bloqueado', detalle: { motivo: 'tiene ventas' }, ip: req.ip, userAgent: req.headers['user-agent'] });
      return res.status(409).json({ error: 'Cliente con ventas asociadas, no eliminable. Inactívelo en su lugar.' });
    }
    const [movs] = await sequelize.query(
      `SELECT COUNT(*)::int AS total FROM movimiento_puntos WHERE cliente_id=:id`,
      { replacements: { id } }
    );
    if (Number(movs[0]?.total ?? 0) > 0) {
      await auditLog({ usuario_id: req.user.id, accion: 'cliente.eliminar_bloqueado', entidad: 'cliente', entidad_id: id, resultado: 'bloqueado', detalle: { motivo: 'tiene movimientos de puntos' }, ip: req.ip, userAgent: req.headers['user-agent'] });
      return res.status(409).json({ error: 'Cliente con movimientos de puntos, no eliminable. Inactívelo en su lugar.' });
    }
    const [deleted] = await sequelize.query(
      `DELETE FROM cliente WHERE id_cliente=:id RETURNING id_cliente`,
      { replacements: { id } }
    );
    if (!deleted[0]) return res.status(404).json({ error: 'Cliente no encontrado' });
    await auditLog({ usuario_id: req.user.id, accion: 'cliente.eliminar', entidad: 'cliente', entidad_id: id, resultado: 'exito', detalle: { nombre: exists[0].nombre, correo: exists[0].correo }, ip: req.ip, userAgent: req.headers['user-agent'] });
    res.json({ ok: true, eliminado: id });
  } catch (e) {
    if (e.code === '23503' || e.original?.code === '23503' || e.parent?.code === '23503') {
      return res.status(409).json({ error: 'Cliente con historial asociado, no eliminable. Inactívelo en su lugar.' });
    }
    next(e);
  }
});

router.post('/:id/ajustes-puntos', authorizeAny(['cliente.puntos', 'cliente.gestionar']), async (req, res, next) => {
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
