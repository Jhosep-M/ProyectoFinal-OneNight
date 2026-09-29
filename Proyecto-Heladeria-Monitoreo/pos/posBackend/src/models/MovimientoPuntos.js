const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('MovimientoPuntos', {
  id_movimiento: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4, field: 'id_movimiento' },
  cliente_id: { type: DataTypes.UUID, allowNull: false, field: 'cliente_id' },
  venta_id: { type: DataTypes.UUID, field: 'venta_id' },
  puntos: { type: DataTypes.INTEGER, allowNull: false, field: 'puntos' },
  tipo: { type: DataTypes.STRING, allowNull: false, field: 'tipo' },
  motivo: { type: DataTypes.STRING, field: 'motivo' },
  fecha: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'fecha' },
}, { tableName: 'movimiento_puntos', timestamps: false });
