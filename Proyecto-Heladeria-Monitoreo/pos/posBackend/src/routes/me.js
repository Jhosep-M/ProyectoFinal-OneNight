const { Router } = require('express');
const { authenticateJWT } = require('../middlewares/authenticate');
const { sequelize } = require('../config/database');

const router = Router();
router.use(authenticateJWT);

router.get('/permissions', async (req, res, next) => {
  try {
    const [rows] = await sequelize.query(
      `SELECT p.nombre
       FROM usuario u
       JOIN rol r ON r.id_rol = u.rol_id
       JOIN rol_permiso rp ON rp.rol_id = r.id_rol
       JOIN permiso p ON p.id_permiso = rp.permiso_id
       WHERE u.id_usuario = :uid AND u.estado = 'activo' AND r.estado = 'activo'`,
      { replacements: { uid: req.user.id } }
    );
    res.json({ permisos: rows.map((r) => r.nombre) });
  } catch (e) { next(e); }
});

router.get('/rol', async (req, res, next) => {
  try {
    const [rows] = await sequelize.query(
      `SELECT r.nombre AS rol
       FROM usuario u
       JOIN rol r ON r.id_rol = u.rol_id
       WHERE u.id_usuario = :uid AND u.estado = 'activo'`,
      { replacements: { uid: req.user.id } }
    );
    res.json({ rol: rows[0]?.rol || null });
  } catch (e) { next(e); }
});

module.exports = { meRouter: router };
