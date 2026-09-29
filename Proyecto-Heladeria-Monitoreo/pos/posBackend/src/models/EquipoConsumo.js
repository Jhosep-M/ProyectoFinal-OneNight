const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('EquipoConsumo', {
  id_equipo: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4, field: 'id_equipo' },
  nombre: { type: DataTypes.STRING, allowNull: false, field: 'nombre' },
  tipo_recurso: { type: DataTypes.STRING, allowNull: false, field: 'tipo_recurso' },
  consumo_por_hora: { type: DataTypes.DECIMAL(14,4), allowNull: false, field: 'consumo_por_hora' },
  unidad_medida: { type: DataTypes.STRING, allowNull: false, field: 'unidad_medida' },
  activo: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'activo' },
}, { tableName: 'equipo_consumo', timestamps: true, createdAt: 'creado_en', updatedAt: 'actualizado_en' });
