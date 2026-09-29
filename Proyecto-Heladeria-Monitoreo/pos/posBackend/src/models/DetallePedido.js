const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('DetallePedido', {
  id_detalle_pedido: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4, field: 'id_detalle_pedido' },
  pedido_id: { type: DataTypes.UUID, allowNull: false, field: 'pedido_id' },
  producto_id: { type: DataTypes.UUID, allowNull: false, field: 'producto_id' },
  cantidad: { type: DataTypes.DECIMAL(14,2), allowNull: false, field: 'cantidad' },
  precio_unitario: { type: DataTypes.DECIMAL(14,2), allowNull: false, field: 'precio_unitario' },
  observacion: { type: DataTypes.TEXT, field: 'observacion' },
  subtotal: { type: DataTypes.DECIMAL(14,2), allowNull: false, field: 'subtotal' },
}, { tableName: 'detalle_pedido', timestamps: false });
