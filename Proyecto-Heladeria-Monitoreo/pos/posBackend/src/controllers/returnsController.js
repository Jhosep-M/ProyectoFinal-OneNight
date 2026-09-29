const devolucionService = require('../services/devolucionService');
async function procesarDevolucion({ venta_id, producto_id, cantidad, motivo, userId }) {
  return devolucionService.procesar(venta_id, producto_id, cantidad, motivo, userId);
}
module.exports = { procesarDevolucion };
