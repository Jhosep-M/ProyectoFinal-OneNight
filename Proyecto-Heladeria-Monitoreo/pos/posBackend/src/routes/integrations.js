const { Router } = require('express');
const crypto = require('crypto');
const { authenticateJWT } = require('../middlewares/authenticate');
const { authorize } = require('../middlewares/authorize');
const { sequelize } = require('../config/database');
const { alertSchema } = require('../validators/alerts');

const router = Router();

// Mapeo contrato alerts.v1 -> CHECK de alerta_pos.nivel
// (contrato: info/advertencia/critico; DB: bajo/medio/alto/critico).
const NIVEL_DB = { info: 'bajo', advertencia: 'medio', critico: 'critico' };

// POST /alerts — receptor Monitoreo→POS con API-key de servicio (SIN JWT de usuario).
// Se define ANTES de router.use(authenticateJWT) para no exigir token de usuario.
router.post('/alerts', async (req, res, next) => {
  try {
    const configuredKey = process.env.POS_ALERT_API_KEY || process.env.MONITOREO_API_KEY || '';
    if (!configuredKey) {
      return res.status(500).json({ error: 'Auth misconfigured' });
    }
    const provided = req.headers['x-api-key'] || '';
    const a = Buffer.from(String(provided));
    const b = Buffer.from(String(configuredKey));
    const valid = a.length === b.length && crypto.timingSafeEqual(a, b);
    if (!valid) {
      return res.status(401).json({ error: 'No autorizado' });
    }
    const parsed = alertSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Payload inválido' });
    }
    const { alertaId, nivel, tipoRecurso, mensaje, fechaGeneracion } = parsed.data;
    // Columnas reales de entrega_alerta: (alerta_externa_id UNIQUE, nivel,
    // tipo, mensaje, estado). Idempotencia por ON CONFLICT (alerta_externa_id).
    const [entregas] = await sequelize.query(
      `INSERT INTO entrega_alerta (alerta_externa_id, nivel, tipo, mensaje, estado)
       VALUES (:alertaId, :nivel, :tipo, :mensaje, 'recibida')
       ON CONFLICT (alerta_externa_id) DO NOTHING RETURNING id_entrega`,
      { replacements: { alertaId, nivel, tipo: tipoRecurso, mensaje } }
    );
    if (!entregas[0]) {
      return res.status(200).json({ already_received: true, alertaId });
    }
    await sequelize.query(
      `INSERT INTO alerta_pos (turno_id, tipo, nivel, mensaje, estado)
       VALUES (NULL, :tipo, :nivel, :mensaje, 'pendiente')`,
      { replacements: { tipo: tipoRecurso, nivel: NIVEL_DB[nivel], mensaje: `${mensaje} [${alertaId} ${fechaGeneracion}]` } }
    );
    return res.status(201).json({ received: true, alertaId });
  } catch (e) { next(e); }
});

router.use(authenticateJWT);

router.get('/', authorize('integracion.consultar'), async (req, res, next) => {
  try {
    const estado = req.query.estado;
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
    const offset = Math.max(parseInt(req.query.offset || '0', 10), 0);
    const repl = { limit, offset };
    let where = '';
    if (estado) { where = 'WHERE estado=:estado'; repl.estado = estado; }
    const [rows] = await sequelize.query(`SELECT * FROM cola_integracion ${where} ORDER BY creado_en DESC LIMIT :limit OFFSET :offset`, { replacements: repl });
    const [countRows] = await sequelize.query(`SELECT COUNT(*)::int as total FROM cola_integracion ${where}`, { replacements: repl });
    res.json({ data: rows, total: countRows[0].total, limit, offset });
  } catch (e) { next(e); }
});

router.get('/cola', authorize('integracion.consultar'), async (req, res, next) => {
  try {
    const estado = req.query.estado || 'pendiente';
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
    const [rows] = await sequelize.query(`SELECT * FROM cola_integracion WHERE estado=:estado ORDER BY creado_en ASC LIMIT :limit`, { replacements: { estado, limit } });
    res.json(rows);
  } catch (e) { next(e); }
});

// Alerta recibidas de Monitoreo (receptor POST /alerts de arriba las guarda en
// alerta_pos con turno_id NULL). DEBE ir antes de GET '/:id' para no ser
// capturada por esa ruta.
router.get('/alerts', authorize('alerta.consultar'), async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
    const offset = Math.max(parseInt(req.query.offset || '0', 10), 0);
    const [rows] = await sequelize.query(
      `SELECT id_alerta, tipo, nivel, mensaje, estado, creado_en
         FROM alerta_pos
        WHERE turno_id IS NULL
        ORDER BY creado_en DESC
        LIMIT :limit OFFSET :offset`,
      { replacements: { limit, offset } },
    );
    const [countRows] = await sequelize.query(
      `SELECT COUNT(*)::int AS total FROM alerta_pos WHERE turno_id IS NULL`,
    );
    res.json({ data: rows, total: countRows[0].total, limit, offset });
  } catch (e) { next(e); }
});

router.get('/:id', authorize('integracion.consultar'), async (req, res, next) => {
  try {
    const [rows] = await sequelize.query(`SELECT * FROM cola_integracion WHERE id_cola=:id`, { replacements: { id: req.params.id } });
    if (!rows[0]) return res.status(404).json({ error: 'Cola no encontrada' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

router.post('/:id/reintentar', authorize('integracion.gestionar'), async (req, res, next) => {
  try {
    const [rows] = await sequelize.query(`UPDATE cola_integracion SET estado='pendiente', proximo_intento=NOW(), intentos=0 WHERE id_cola=:id RETURNING *`, { replacements: { id: req.params.id } });
    if (!rows[0]) return res.status(404).json({ error: 'Cola no encontrada' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

module.exports = { integrationsRouter: router };
