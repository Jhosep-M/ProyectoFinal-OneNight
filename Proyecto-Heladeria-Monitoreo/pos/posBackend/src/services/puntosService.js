const { sequelize } = require('../config/database');

function calculaPuntos(total) {
  const t = Number(total || 0);
  if (!Number.isFinite(t) || t <= 0) return 0;
  return Math.floor(t / 10);
}

// Hook para P1: llamar desde registrar_venta (PG/Node) cuando cliente_id presente.
// No modifica saldo sin trazabilidad: INSERT movimiento + UPDATE cliente en la misma tx.
async function acumularPuntos({ clienteId, ventaId = null, total, motivo = 'acumulacion', transaction }) {
  if (!clienteId) return { puntos: 0, skipped: true };
  const puntos = calculaPuntos(total);
  if (puntos <= 0) return { puntos: 0, skipped: true };
  const run = async (t) => {
    await sequelize.query(
      `INSERT INTO movimiento_puntos (cliente_id, venta_id, puntos, tipo, motivo) VALUES (:cli, :venta, :pts, 'acumulacion', :mot)`,
      { replacements: { cli: clienteId, venta: ventaId, pts: puntos, mot: motivo }, transaction: t }
    );
    await sequelize.query(`UPDATE cliente SET puntos_fidelidad = puntos_fidelidad + :pts WHERE id_cliente = :cli`, {
      replacements: { pts: puntos, cli: clienteId }, transaction: t,
    });
    return { puntos, skipped: false };
  };
  if (transaction) return run(transaction);
  return sequelize.transaction(run);
}

module.exports = { calculaPuntos, acumularPuntos };
