const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('DetalleVenta', {
  id_detalle_venta: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4, field: 'id_detalle_venta' },
  venta_id: { type: DataTypes.UUID, allowNull: false, field: 'venta_id' },
  producto_id: { type: DataTypes.UUID, allowNull: false, field: 'producto_id' },
  cantidad: { type: DataTypes.DECIMAL(14,2), allowNull: false, field: 'cantidad' },
  precio_unitario: { type: DataTypes.DECIMAL(14,2), allowNull: false, field: 'precio_unitario' },
  descuento: { type: DataTypes.DECIMAL(14,2), defaultValue: 0, field: 'descuento' },
  subtotal: { type: DataTypes.DECIMAL(14,2), allowNull: false, field: 'subtotal' },
}, { tableName: 'detalle_venta', timestamps: false });
