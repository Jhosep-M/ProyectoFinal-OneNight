'use strict';

const { sequelize } = require('../config/database');

// Estados de pedido que cierran la cuenta.
// NOTA: chk_pedido_estado (001-v2.1-ddl) declara
// ('abierto','en_preparacion','entregado','cobrado','cancelado'),
// pero el flujo de cobro (routes/orders.js) escribe 'cerrado'.
// Se cubren ambos vocabularios para no liberar/cobrar de menos.
const PEDIDO_CERRADO_ESTADOS = "('cerrado','cobrado','cancelado')";

// Cuenta abierta de una mesa: nº de pedidos no cerrados + total pendiente.
// Misma definición que el GET / de mesas (COUNT + SUM sobre pedidos
// no cerrados/cancelados). Las rutas la usan como guard antes de
// liberar o eliminar; la lógica pesada vive aquí, no en routes.
async function cuentaAbiertaPorMesa(mesaId, transaction) {
  const [rows] = await sequelize.query(
    `SELECT
       (SELECT COUNT(*)::int FROM pedido p
         WHERE p.mesa_id = :id AND p.estado NOT IN ${PEDIDO_CERRADO_ESTADOS}) AS abiertos,
       COALESCE((SELECT SUM(dp.cantidad * dp.precio_unitario) FROM detalle_pedido dp
         JOIN pedido p ON p.id_pedido = dp.pedido_id
         WHERE p.mesa_id = :id AND p.estado NOT IN ${PEDIDO_CERRADO_ESTADOS}), 0) AS total`,
    {
      replacements: { id: mesaId },
      ...(transaction ? { transaction } : {}),
    }
  );
  const r = rows[0] || {};
  return { abiertos: Number(r.abiertos) || 0, total: Number(r.total) || 0 };
}

function tieneCuentaPendiente(cuenta) {
  return cuenta.abiertos > 0 || Number(cuenta.total) > 0;
}

module.exports = { cuentaAbiertaPorMesa, tieneCuentaPendiente };
