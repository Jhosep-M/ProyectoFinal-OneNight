const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('Pedido', {
  id_pedido: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4, field: 'id_pedido' },
  // Mostrador / Para llevar: sin mesa. Nullable a nivel DB (migracion 014).
  mesa_id: { type: DataTypes.UUID, allowNull: true, field: 'mesa_id' },
  mesero_id: { type: DataTypes.UUID, field: 'mesero_id' },
  estado: { type: DataTypes.STRING, defaultValue: 'abierto', field: 'estado' },
  // Origen del pedido (migracion 025): 'mesa' por defecto, 'mostrador' para
  // mostrador/para llevar, 'venta_directa' para el espejo que Ventas crea solo
  // para visibilidad en Cocina (ya cobrado, no se puede volver a cobrar).
  origen: { type: DataTypes.STRING, defaultValue: 'mesa', field: 'origen' },
  fecha: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'fecha' },
  // Migracion 026: congela el contador de Cocina. Se pone con NOW() al
  // transicionar a 'listo' (routes/orders.js PATCH /:id/estado).
  fecha_listo: { type: DataTypes.DATE, allowNull: true, field: 'fecha_listo' },
  fecha_cierre: { type: DataTypes.DATE, field: 'fecha_cierre' },
}, { tableName: 'pedido', timestamps: false });
