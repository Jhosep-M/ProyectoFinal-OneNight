const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('Producto', {
  id_producto: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4, field: 'id_producto' },
  categoria_id: { type: DataTypes.UUID, field: 'categoria_id' },
  nombre: { type: DataTypes.STRING, allowNull: false, field: 'nombre' },
  precio: { type: DataTypes.DECIMAL(14,2), allowNull: false, field: 'precio' },
  stock: { type: DataTypes.DECIMAL(14,2), defaultValue: 0, field: 'stock' },
  stock_minimo: { type: DataTypes.DECIMAL(14,2), defaultValue: 0, field: 'stock_minimo' },
  estado: { type: DataTypes.STRING, defaultValue: 'activo', field: 'estado' },
}, { tableName: 'producto', timestamps: true, createdAt: 'creado_en', updatedAt: 'actualizado_en' });
