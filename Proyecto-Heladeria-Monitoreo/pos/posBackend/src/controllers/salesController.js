const { sequelize } = require('../config/database');
const { registrarVentaSchema } = require('../validators/sales');
const ventaService = require('../services/ventaService');

/**
 * Controller ventas — capa fina routes → controllers → services.
 * No contiene SQL de negocio; delega a ventaService (funciones PG SECURITY DEFINER).
 */

async function listar(filtros = {}, userId) {
  const { desde, hasta, estado, cajero, metodo, turno_id } = filtros || {};
  const where = [];
  const repl = {};
  let joinTurno = '';

  // Ownership: sin turno.consultar.todos solo ve ventas de sus propios turnos.
  // Reutiliza el permiso existente (respeta authorize('venta.consultar') de la ruta).
  let esAdmin = false;
  if (userId) {
    const [permRows] = await sequelize.query(
      `SELECT usuario_tiene_permiso(:uid, 'turno.consultar.todos') AS admin`,
      { replacements: { uid: userId } }
    );
    esAdmin = !!(permRows && permRows[0] && permRows[0].admin);
  } else {
    esAdmin = true; // sin usuario (tests/unit) no restringe
  }
  if (!esAdmin) {
    joinTurno = 'JOIN turno_caja t ON t.id_turno = v.turno_id';
    where.push('t.usuario_id = :uid');
    repl.uid = userId;
  } else if (cajero) {
    joinTurno = 'JOIN turno_caja t ON t.id_turno = v.turno_id';
    where.push('t.usuario_id = :cajero');
    repl.cajero = cajero;
  }
  if (desde) {
    if (Number.isNaN(Date.parse(desde))) {
      throw Object.assign(new Error('desde debe ser fecha válida'), { status: 400 });
    }
    where.push('v.fecha >= :desde::timestamptz');
    repl.desde = desde;
  }
  if (hasta) {
    if (Number.isNaN(Date.parse(hasta))) {
      throw Object.assign(new Error('hasta debe ser fecha válida'), { status: 400 });
    }
    where.push('v.fecha <= :hasta::timestamptz');
    repl.hasta = hasta;
  }
  if (estado) {
    if (!['activa', 'anulada'].includes(estado)) {
      throw Object.assign(new Error('estado debe ser activa|anulada'), { status: 400 });
    }
    where.push('v.estado = :estado');
    repl.estado = estado;
  }
  if (turno_id) {
    where.push('v.turno_id = :turno');
    repl.turno = turno_id;
  }
  if (metodo) {
    where.push(`EXISTS (SELECT 1 FROM pago p WHERE p.venta_id = v.id_venta AND p.metodo_pago_id = :metodo)`);
    repl.metodo = metodo;
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await sequelize.query(
    `SELECT v.* FROM venta v ${joinTurno} ${whereSql} ORDER BY v.fecha DESC LIMIT 50`,
    { replacements: repl }
  );
  return rows;
}

async function crear(body, userId) {
  const parsed = registrarVentaSchema.parse(body);
  const venta_id = await ventaService.crear({
    turno_id: parsed.turno_id,
    items: parsed.items,
    pagos: parsed.pagos,
    userId,
    cliente_id: parsed.cliente_id,
    descuento: parsed.descuento,
    puntos_canje: parsed.puntos_canje ?? 0,
    idempotencyKey: parsed.idempotencyKey ?? undefined,
  });
  return { venta_id };
}

async function anular(ventaId, motivo, userId) {
  if (!motivo || motivo.trim().length < 5) {
    const e = new Error('motivo requerido >=5 chars');
    e.status = 400;
    throw e;
  }
  await ventaService.anular(ventaId, motivo, userId);
  return { ok: true };
}

module.exports = { listar, crear, anular };
