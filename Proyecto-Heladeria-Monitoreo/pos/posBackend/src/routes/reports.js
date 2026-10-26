const { Router } = require('express');
const { authenticateJWT } = require('../middlewares/authenticate');
const { authorize } = require('../middlewares/authorize');
const { sequelize } = require('../config/database');
const { auditLog } = require('../utils/audit');

const router = Router();
router.use(authenticateJWT);

function validarRango(desde, hasta) {
  if (desde && Number.isNaN(Date.parse(desde))) {
    return 'desde debe ser fecha válida';
  }
  if (hasta && Number.isNaN(Date.parse(hasta))) {
    return 'hasta debe ser fecha válida';
  }
  return null;
}

async function esAdmin(uid) {
  const [permRows] = await sequelize.query(
    `SELECT usuario_tiene_permiso(:uid, 'turno.consultar.todos') AS admin`,
    { replacements: { uid } }
  );
  return !!(permRows && permRows[0] && permRows[0].admin);
}

function construirWhere({ desde, hasta, admin, uid }) {
  const where = [`v.estado = 'activa'`];
  const repl = {};
  if (!admin) {
    where.push('t.usuario_id = :uid');
    repl.uid = uid;
  }
  if (desde) { where.push('v.fecha >= :desde::timestamptz'); repl.desde = desde; }
  if (hasta) { where.push('v.fecha <= :hasta::timestamptz'); repl.hasta = hasta; }
  return { whereSql: `WHERE ${where.join(' AND ')}`, repl };
}

async function obtenerCierre({ desde, hasta, admin, uid }) {
  const { whereSql, repl } = construirWhere({ desde, hasta, admin, uid });
  const [totales] = await sequelize.query(
    `SELECT COUNT(*)::int AS ventas, COALESCE(SUM(v.total), 0) AS monto
     FROM venta v JOIN turno_caja t ON t.id_turno = v.turno_id ${whereSql}`,
    { replacements: repl }
  );
  const [porMetodo] = await sequelize.query(
    `SELECT COALESCE(mp.nombre, 'sin método') AS metodo,
            COALESCE(SUM(p.monto), 0) AS total,
            COUNT(*)::int AS pagos
     FROM pago p
     JOIN venta v ON v.id_venta = p.venta_id
     JOIN turno_caja t ON t.id_turno = v.turno_id
     LEFT JOIN metodo_pago mp ON mp.id_metodo_pago = p.metodo_pago_id
     ${whereSql}
     GROUP BY mp.nombre ORDER BY total DESC`,
    { replacements: repl }
  );
  const [porTurno] = await sequelize.query(
    `SELECT v.turno_id, COUNT(*)::int AS ventas, COALESCE(SUM(v.total), 0) AS total
     FROM venta v JOIN turno_caja t ON t.id_turno = v.turno_id ${whereSql}
     GROUP BY v.turno_id ORDER BY total DESC`,
    { replacements: repl }
  );
  const [topProductos] = await sequelize.query(
    `SELECT dv.producto_id, COALESCE(pr.nombre, 'producto') AS producto,
            COALESCE(SUM(dv.cantidad), 0) AS cantidad,
            COALESCE(SUM(dv.subtotal), 0) AS total
     FROM detalle_venta dv
     JOIN venta v ON v.id_venta = dv.venta_id
     JOIN turno_caja t ON t.id_turno = v.turno_id
     LEFT JOIN producto pr ON pr.id_producto = dv.producto_id
     ${whereSql}
     GROUP BY dv.producto_id, pr.nombre ORDER BY cantidad DESC LIMIT 10`,
    { replacements: repl }
  );
  return {
    desde: desde || null,
    hasta: hasta || null,
    totalVentas: (totales[0] && totales[0].ventas) || 0,
    montoTotal: (totales[0] && totales[0].monto) || 0,
    porMetodo: porMetodo || [],
    porTurno: porTurno || [],
    topProductos: topProductos || [],
  };
}

function csvEsc(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function cierreACSV(cierre) {
  const filas = ['seccion,clave,cantidad,total'];
  (cierre.porMetodo || []).forEach((m) =>
    filas.push(`metodo,${csvEsc(m.metodo)},${m.pagos},${m.total}`)
  );
  (cierre.topProductos || []).forEach((p) =>
    filas.push(`producto,${csvEsc(p.producto)},${p.cantidad},${p.total}`)
  );
  (cierre.porTurno || []).forEach((t) =>
    filas.push(`turno,${t.turno_id},${t.ventas},${t.total}`)
  );
  return filas.join('\n');
}

// GET /api/v1/reports/cierre?desde&hasta — cierre exportable del día/rango.
// Totales por método de pago (SUM GROUP BY parametrizado), ventas por turno.
// Ownership: sin turno.consultar.todos solo agrega sus propios turnos.
router.get('/cierre', authorize('venta.consultar'), async (req, res, next) => {
  try {
    const { desde, hasta } = req.query;
    const errRango = validarRango(desde, hasta);
    if (errRango) {
      return res.status(400).json({ error: errRango });
    }
    const admin = await esAdmin(req.user.id);
    const cierre = await obtenerCierre({ desde, hasta, admin, uid: req.user.id });
    res.json(cierre);
  } catch (e) { next(e); }
});

// HU-25 — GET /api/v1/reports/export?desde&hasta&formato=csv
// Solo admin/supervisor (turno.consultar.todos). CSV descargable + auditoría.
router.get('/export', authorize('venta.consultar'), async (req, res, next) => {
  try {
    const { desde, hasta, formato = 'csv' } = req.query;
    const errRango = validarRango(desde, hasta);
    if (errRango) {
      return res.status(400).json({ error: errRango });
    }
    if (formato !== 'csv') {
      return res.status(400).json({ error: 'formato debe ser csv' });
    }
    const admin = await esAdmin(req.user.id);
    if (!admin) {
      return res.status(403).json({ error: 'No tienes permiso para exportar reportes' });
    }
    const cierre = await obtenerCierre({ desde, hasta, admin, uid: req.user.id });
    const csv = cierreACSV(cierre);
    await auditLog({
      usuario_id: req.user.id,
      accion: 'reporte.exportar',
      entidad: 'reporte',
      entidad_id: null,
      resultado: 'exito',
      detalle: { desde: desde || null, hasta: hasta || null, formato },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    const nombre = `cierre-${desde || 'todos'}_${hasta || 'todos'}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
    return res.send(csv);
  } catch (e) { next(e); }
});

module.exports = { reportsRouter: router };
