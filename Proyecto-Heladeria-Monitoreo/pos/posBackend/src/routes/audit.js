const { Router } = require('express');
const { authenticateJWT } = require('../middlewares/authenticate');
const { authorize } = require('../middlewares/authorize');
const { sequelize } = require('../config/database');

const router = Router();
router.use(authenticateJWT);

router.get('/', authorize('auditoria.consultar'), async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
    const offset = Math.max(parseInt(req.query.offset || '0', 10), 0);
    const accion = req.query.accion;
    const entidad = req.query.entidad;
    const usuario_id = req.query.usuario_id;
    const desde = req.query.desde;
    const hasta = req.query.hasta;

    const where = [];
    const repl = { limit, offset };
    if (accion) { where.push('accion=:accion'); repl.accion = accion; }
    if (entidad) { where.push('entidad=:entidad'); repl.entidad = entidad; }
    if (usuario_id) { where.push('usuario_id=:uid'); repl.uid = usuario_id; }
    if (desde) { where.push('fecha >= :desde::timestamptz'); repl.desde = desde; }
    if (hasta) { where.push('fecha <= :hasta::timestamptz'); repl.hasta = hasta; }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [rows] = await sequelize.query(`SELECT * FROM auditoria_accion ${whereSql} ORDER BY fecha DESC LIMIT :limit OFFSET :offset`, { replacements: repl });
    const [countRows] = await sequelize.query(`SELECT COUNT(*)::int as total FROM auditoria_accion ${whereSql}`, { replacements: repl });
    res.json({ data: rows, total: countRows[0].total, limit, offset });
  } catch (e) { next(e); }
});

router.get('/:id', authorize('auditoria.consultar'), async (req, res, next) => {
  try {
    const [rows] = await sequelize.query(`SELECT * FROM auditoria_accion WHERE id_auditoria=:id`, { replacements: { id: req.params.id } });
    if (!rows[0]) return res.status(404).json({ error: 'Auditoría no encontrada' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

module.exports = { auditRouter: router };
