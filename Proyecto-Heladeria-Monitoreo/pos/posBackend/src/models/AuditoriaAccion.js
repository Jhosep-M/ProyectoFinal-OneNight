const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('AuditoriaAccion', {
  id_auditoria: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4, field: 'id_auditoria' },
  usuario_id: { type: DataTypes.UUID, field: 'usuario_id' },
  accion: { type: DataTypes.STRING, allowNull: false, field: 'accion' },
  entidad: { type: DataTypes.STRING, field: 'entidad' },
  entidad_id: { type: DataTypes.UUID, field: 'entidad_id' },
  resultado: { type: DataTypes.STRING, field: 'resultado' },
  direccion_ip: { type: DataTypes.STRING, field: 'direccion_ip' },
  user_agent: { type: DataTypes.STRING, field: 'user_agent' },
  fecha: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'fecha' },
  detalle: { type: DataTypes.TEXT, field: 'detalle' },
}, { tableName: 'auditoria_accion', timestamps: false });
