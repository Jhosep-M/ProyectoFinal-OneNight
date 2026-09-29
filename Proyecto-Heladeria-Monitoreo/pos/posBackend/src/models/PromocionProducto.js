const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('PromocionProducto', {
  id_promocion_producto: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4, field: 'id_promocion_producto' },
  promocion_id: { type: DataTypes.UUID, allowNull: false, field: 'promocion_id' },
  producto_id: { type: DataTypes.UUID, allowNull: false, field: 'producto_id' },
}, { tableName: 'promocion_producto', timestamps: false });
