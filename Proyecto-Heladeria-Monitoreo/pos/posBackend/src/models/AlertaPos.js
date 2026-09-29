const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('AlertaPos', {
  id_alerta: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4, field: 'id_alerta' },
  turno_id: { type: DataTypes.UUID, allowNull: false, field: 'turno_id' },
  tipo: { type: DataTypes.STRING, allowNull: false, field: 'tipo' },
  nivel: { type: DataTypes.STRING, allowNull: false, field: 'nivel' },
  mensaje: { type: DataTypes.TEXT, allowNull: false, field: 'mensaje' },
  estado: { type: DataTypes.STRING, defaultValue: 'pendiente', field: 'estado' },
  creado_en: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'creado_en' },
  atendido_en: { type: DataTypes.DATE, field: 'atendido_en' },
  atendido_por: { type: DataTypes.UUID, field: 'atendido_por' },
}, { tableName: 'alerta_pos', timestamps: false });
