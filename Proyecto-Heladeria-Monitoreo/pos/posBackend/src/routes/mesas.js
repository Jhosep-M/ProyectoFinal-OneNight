const { Router } = require('express');
const { authenticateJWT } = require('../middlewares/authenticate');
const { authorize } = require('../middlewares/authorize');
const { sequelize } = require('../config/database');
const { auditLog } = require('../utils/audit');

const router = Router();
router.use(authenticateJWT);

// NOTA: requiere permiso 'mesa.consultar' (seed pendiente de Persona 4,
// igual que pedido.*/pago.*). Sin el seed, authorize responde 403.
router.get('/', authorize('mesa.consultar'), async (_req, res, next) => {
  try {
    const [rows] = await sequelize.query(
      `SELECT m.*,
        (SELECT COUNT(*)::int FROM pedido p
          WHERE p.mesa_id = m.id_mesa AND p.estado NOT IN ('cerrado','cancelado')) AS pedidos_abiertos
       FROM mesa m ORDER BY numero`
    );
    res.json(rows);
  } catch (e) { next(e); }
});

router.get('/:id', authorize('mesa.consultar'), async (req, res, next) => {
  try {
    const [rows] = await sequelize.query(`SELECT * FROM mesa WHERE id_mesa=:id`, {
      replacements: { id: req.params.id },
    });
    if (!rows[0]) return res.status(404).json({ error: 'Mesa no encontrada' });
    const [pedidos] = await sequelize.query(
      `SELECT p.*, u.nombre AS mesero_nombre FROM pedido p
       LEFT JOIN usuario u ON u.id_usuario = p.mesero_id
       WHERE p.mesa_id=:id AND p.estado NOT IN ('cerrado','cancelado')
       ORDER BY p.fecha DESC`,
      { replacements: { id: req.params.id } }
    );
    res.json({ ...rows[0], pedidos });
  } catch (e) { next(e); }
});

router.post('/', authorize('mesa.gestionar'), async (req, res, next) => {
  try {
<<<<<<< HEAD
    const numero = Number(req.body.numero ?? req.body.nombre);
=======
    const numero = Number(req.body.numero);
>>>>>>> origin/feature/Airton-auxilio
    if (!Number.isInteger(numero) || numero <= 0) {
      return res.status(400).json({ error: 'numero debe ser entero > 0' });
    }
    const [rows] = await sequelize.query(
      `INSERT INTO mesa (numero, estado) VALUES (:numero, 'libre') RETURNING *`,
      { replacements: { numero } }
    );
    await auditLog({
      usuario_id: req.user.id, accion: 'mesa.crear', entidad: 'mesa',
      entidad_id: rows[0].id_mesa, resultado: 'exito', detalle: { numero },
      ip: req.ip, userAgent: req.headers['user-agent'],
    });
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.original?.code === '23505' || e.parent?.code === '23505') {
      return res.status(409).json({ error: 'Número de mesa duplicado' });
    }
    next(e);
  }
});

<<<<<<< HEAD
// PATCH /:id — cambiar estado (liberar/ocupar/reservar).
// El frontend anterior tenía botones sin handler porque no existía este endpoint.
router.patch('/:id', authorize('mesa.gestionar'), async (req, res, next) => {
  try {
    const estado = String(req.body.estado || '').trim().toLowerCase();
    const validos = ['libre', 'disponible', 'ocupada', 'reservada'];
    if (!validos.includes(estado)) {
      return res.status(400).json({ error: 'estado debe ser libre, ocupada o reservada' });
    }
    const normalizado = estado === 'disponible' ? 'libre' : estado;
    const [rows] = await sequelize.query(
      `UPDATE mesa SET estado=:estado WHERE id_mesa=:id RETURNING *`,
      { replacements: { estado: normalizado, id: req.params.id } }
    );
    if (!rows[0]) return res.status(404).json({ error: 'Mesa no encontrada' });
    await auditLog({
      usuario_id: req.user.id, accion: 'mesa.actualizar', entidad: 'mesa',
      entidad_id: req.params.id, resultado: 'exito', detalle: { estado: normalizado },
      ip: req.ip, userAgent: req.headers['user-agent'],
    });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

=======
>>>>>>> origin/feature/Airton-auxilio
module.exports = { mesasRouter: router };
