const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('MovimientoInventario', {
  id_movimiento: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4, field: 'id_movimiento' },
  insumo_id: { type: DataTypes.UUID, field: 'insumo_id' },
  proveedor_id: { type: DataTypes.UUID, field: 'proveedor_id' },
  usuario_id: { type: DataTypes.UUID, field: 'usuario_id' },
  producto_id: { type: DataTypes.UUID, field: 'producto_id' },
  venta_id: { type: DataTypes.UUID, field: 'venta_id' },
  devolucion_id: { type: DataTypes.UUID, field: 'devolucion_id' },
  tipo: { type: DataTypes.STRING, allowNull: false, field: 'tipo' },
  cantidad: { type: DataTypes.DECIMAL(14,2), allowNull: false, field: 'cantidad' },
  motivo: { type: DataTypes.STRING, field: 'motivo' },
  fecha: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'fecha' },
}, { tableName: 'movimiento_inventario', timestamps: false });
