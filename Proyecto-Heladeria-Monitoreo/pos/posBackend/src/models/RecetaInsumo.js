const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('RecetaInsumo', {
  id_receta: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4, field: 'id_receta' },
  producto_id: { type: DataTypes.UUID, allowNull: false, field: 'producto_id' },
  insumo_id: { type: DataTypes.UUID, allowNull: false, field: 'insumo_id' },
  cantidad_requerida: { type: DataTypes.DECIMAL(14,4), allowNull: false, field: 'cantidad_requerida' },
}, { tableName: 'receta_insumo', timestamps: false });
