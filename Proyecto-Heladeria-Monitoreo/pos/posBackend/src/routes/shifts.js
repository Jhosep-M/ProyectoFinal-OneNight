const { Router } = require('express');
const { authenticateJWT } = require('../middlewares/authenticate');
const { authorize } = require('../middlewares/authorize');
const { cerrarTurnoSchema } = require('../validators/sales');
const { abrirTurnoSchema } = require('../validators/shifts');
const { sequelize } = require('../config/database');
const turnoService = require('../services/turnoService');

const router = Router();
router.use(authenticateJWT);

router.get('/', authorize('turno.consultar'), async (req, res) => {
  const userId = req.user.id;
  const [rows] = await sequelize.query(`SELECT * FROM turno_caja WHERE usuario_id = :uid OR EXISTS (SELECT 1 FROM usuario u JOIN rol r ON r.id_rol=u.rol_id JOIN rol_permiso rp ON rp.rol_id=r.id_rol JOIN permiso p ON p.id_permiso=rp.permiso_id WHERE u.id_usuario=:uid AND p.nombre='turno.consultar.todos') ORDER BY fecha_apertura DESC`, { replacements: { uid: userId } });
  res.json(rows);
});

router.post('/', authorize('turno.abrir'), async (req, res, next) => {
  try {
    const parsed = abrirTurnoSchema.parse(req.body);
    const userId = req.user.id;
    const turno = await turnoService.abrir(userId, parsed.monto_inicial);
    res.status(201).json(turno);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: e.errors });
    if (e.original?.code === '23505') return res.status(409).json({ error: 'Ya tiene un turno abierto' });
    next(e);
  }
});

router.post('/:id/cerrar', authorize('turno.cerrar'), async (req, res, next) => {
  try {
    const parsed = cerrarTurnoSchema.parse(req.body);
    const result = await turnoService.cerrar(req.params.id, parsed.monto_final_real);
    res.json(result);
  } catch (e) { next(e); }
});

module.exports = { shiftsRouter: router };
