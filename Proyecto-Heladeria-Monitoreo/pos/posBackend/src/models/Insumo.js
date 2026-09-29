const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('Insumo', {
  id_insumo: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4, field: 'id_insumo' },
  nombre: { type: DataTypes.STRING, allowNull: false, field: 'nombre' },
  unidad_medida: { type: DataTypes.STRING, field: 'unidad_medida' },
  stock: { type: DataTypes.DECIMAL(14,2), defaultValue: 0, field: 'stock' },
  stock_minimo: { type: DataTypes.DECIMAL(14,2), defaultValue: 0, field: 'stock_minimo' },
  fecha_vencimiento: { type: DataTypes.DATE, field: 'fecha_vencimiento' },
  estado: { type: DataTypes.STRING, defaultValue: 'disponible', field: 'estado' },
}, { tableName: 'insumo', timestamps: false });
