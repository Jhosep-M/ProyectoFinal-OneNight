const { Router } = require('express');
const { authenticateJWT } = require('../middlewares/authenticate');
const { authorize } = require('../middlewares/authorize');
const shiftsController = require('../controllers/shiftsController');

const router = Router();
router.use(authenticateJWT);

router.get('/', authorize('turno.consultar'), async (req, res, next) => {
  try {
    res.json(await shiftsController.listarMios(req.user.id));
  } catch (e) { next(e); }
});

// Solo lectura global: exige turno.consultar.todos. Va antes de /:id.
router.get('/todos', authorize('turno.consultar.todos'), async (_req, res, next) => {
  try {
    res.json(await shiftsController.listarTodos());
  } catch (e) { next(e); }
});

// Permisos propios para ownership en UI (no filtra mapa de permisos).
router.get('/permisos', async (req, res, next) => {
  try {
    res.json(await shiftsController.permisos(req.user.id));
  } catch (e) { next(e); }
});

router.post('/', authorize('turno.abrir'), async (req, res, next) => {
  try {
    res.status(201).json(await shiftsController.abrir(req.body, req.user.id));
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: e.errors });
    if (e.original?.code === '23505') return res.status(409).json({ error: 'Ya tiene un turno abierto' });
    next(e);
  }
});

router.post('/:id/cerrar', authorize('turno.cerrar'), async (req, res, next) => {
  try {
    res.json(await shiftsController.cerrar(req.params.id, req.body, req.user.id));
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: e.errors });
    const msg = String((e && e.message) || '');
    // Reactivo: la función PG exige motivo si la diferencia supera el umbral o el
    // turno es ajeno. Devuelve 422 con la diferencia/esperado/umbral para que la UI
    // pida el motivo sin recalcular nada.
    if (msg.includes('MOTIVO_REQUERIDO')) {
      const num = (key) => {
        const m = msg.match(new RegExp(`${key}=(-?[0-9.]+)`));
        return m ? Number(m[1]) : null;
      };
      return res.status(422).json({
        code: 'MOTIVO_REQUERIDO',
        error: 'La diferencia supera el umbral permitido. Ingresa un motivo para cerrar el turno.',
        diferencia: num('diferencia'),
        montoEsperado: num('esperado'),
        umbral: num('umbral'),
        esTurnoAjeno: /ajeno=t/.test(msg),
      });
    }
    if (msg.includes('DIFERENCIA_CRITICA')) {
      const num = (key) => {
        const m = msg.match(new RegExp(`${key}=(-?[0-9.]+)`));
        return m ? Number(m[1]) : null;
      };
      return res.status(409).json({
        code: 'DIFERENCIA_CRITICA',
        error: 'Diferencia crítica, requiere supervisor.',
        diferencia: num('diferencia'),
        montoEsperado: num('esperado'),
        umbral: num('umbral'),
        esTurnoAjeno: /ajeno=t/.test(msg),
      });
    }
    if (/no autorizado a cerrar turno ajeno/i.test(msg)) {
      return res.status(403).json({ error: 'No puedes cerrar un turno ajeno' });
    }
    if (/no est[aá] abierto|ya cerrado/i.test(msg)) {
      return res.status(409).json({ error: 'El turno ya no está abierto' });
    }
    next(e);
  }
});

module.exports = { shiftsRouter: router };
