const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('Venta', {
  id_venta: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4, field: 'id_venta' },
  turno_id: { type: DataTypes.UUID, allowNull: false, field: 'turno_id' },
  cliente_id: { type: DataTypes.UUID, field: 'cliente_id' },
  pedido_id: { type: DataTypes.UUID, field: 'pedido_id' },
  subtotal: { type: DataTypes.DECIMAL(14,2), defaultValue: 0, field: 'subtotal' },
  descuento: { type: DataTypes.DECIMAL(14,2), defaultValue: 0, field: 'descuento' },
  total: { type: DataTypes.DECIMAL(14,2), allowNull: false, field: 'total' },
  estado: { type: DataTypes.STRING, defaultValue: 'activa', field: 'estado' },
  motivo_anulacion: { type: DataTypes.TEXT, field: 'motivo_anulacion' },
  fecha: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'fecha' },
  idempotency_key: { type: DataTypes.STRING, unique: true, field: 'idempotency_key' },
}, { tableName: 'venta', timestamps: false });
