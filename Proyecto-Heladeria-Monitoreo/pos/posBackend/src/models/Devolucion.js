const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('Devolucion', {
  id_devolucion: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4, field: 'id_devolucion' },
  venta_id: { type: DataTypes.UUID, allowNull: false, field: 'venta_id' },
  producto_id: { type: DataTypes.UUID, allowNull: false, field: 'producto_id' },
  autorizado_por_id: { type: DataTypes.UUID, field: 'autorizado_por_id' },
  cantidad: { type: DataTypes.DECIMAL(14,2), allowNull: false, field: 'cantidad' },
  monto: { type: DataTypes.DECIMAL(14,2), allowNull: false, field: 'monto' },
  motivo: { type: DataTypes.TEXT, field: 'motivo' },
  estado: { type: DataTypes.STRING, defaultValue: 'pendiente', field: 'estado' },
  fecha: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'fecha' },
}, { tableName: 'devolucion', timestamps: false });
