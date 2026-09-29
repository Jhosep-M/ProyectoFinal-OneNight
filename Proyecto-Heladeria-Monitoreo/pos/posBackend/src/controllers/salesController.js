const { sequelize } = require('../config/database');
const { registrarVentaSchema } = require('../validators/sales');
const ventaService = require('../services/ventaService');

/**
 * Controller ventas — capa fina routes → controllers → services.
 * No contiene SQL de negocio; delega a ventaService (funciones PG SECURITY DEFINER).
 */

async function listar() {
  const [rows] = await sequelize.query('SELECT * FROM venta ORDER BY fecha DESC LIMIT 50');
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
