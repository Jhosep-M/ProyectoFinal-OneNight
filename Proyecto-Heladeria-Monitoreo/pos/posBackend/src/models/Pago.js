const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('Pago', {
  id_pago: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4, field: 'id_pago' },
  venta_id: { type: DataTypes.UUID, allowNull: false, field: 'venta_id' },
  metodo_pago_id: { type: DataTypes.UUID, allowNull: false, field: 'metodo_pago_id' },
  monto: { type: DataTypes.DECIMAL(14,2), allowNull: false, field: 'monto' },
  referencia: { type: DataTypes.STRING, field: 'referencia' },
  estado: { type: DataTypes.STRING, defaultValue: 'confirmado', field: 'estado' },
  fecha: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'fecha' },
}, { tableName: 'pago', timestamps: false });
