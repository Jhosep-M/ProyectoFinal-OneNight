const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('Promocion', {
  id_promocion: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4, field: 'id_promocion' },
  nombre: { type: DataTypes.STRING, allowNull: false, field: 'nombre' },
  porcentaje_descuento: { type: DataTypes.DECIMAL(14,2), allowNull: false, field: 'porcentaje_descuento' },
  fecha_inicio: { type: DataTypes.DATE, field: 'fecha_inicio' },
  fecha_fin: { type: DataTypes.DATE, field: 'fecha_fin' },
  estado: { type: DataTypes.STRING, defaultValue: 'activa', field: 'estado' },
}, { tableName: 'promocion', timestamps: false });
