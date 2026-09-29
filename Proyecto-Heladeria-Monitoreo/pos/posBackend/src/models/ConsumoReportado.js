const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('ConsumoReportado', {
  id_consumo: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4, field: 'id_consumo' },
  turno_id: { type: DataTypes.UUID, allowNull: false, field: 'turno_id' },
  tipo_recurso: { type: DataTypes.STRING, allowNull: false, field: 'tipo_recurso' },
  cantidad: { type: DataTypes.DECIMAL(14,4), allowNull: false, field: 'cantidad' },
  unidad_medida: { type: DataTypes.STRING, allowNull: false, field: 'unidad_medida' },
  fecha_consumo: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'fecha_consumo' },
  estado: { type: DataTypes.STRING, defaultValue: 'pendiente', field: 'estado' },
  fecha_creacion: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'fecha_creacion' },
}, { tableName: 'consumo_reportado', timestamps: false });
