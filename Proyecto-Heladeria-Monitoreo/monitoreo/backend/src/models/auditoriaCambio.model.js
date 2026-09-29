const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { env } = require('../config/environment');

const AuditoriaCambio = sequelize.define('AuditoriaCambio', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  entidad: { type: DataTypes.STRING(60), allowNull: false },
  entidad_id: { type: DataTypes.UUID, allowNull: true },
  accion: { type: DataTypes.STRING(40), allowNull: false },
  usuario_id: { type: DataTypes.UUID, allowNull: true },
  req_id: { type: DataTypes.STRING(60), allowNull: true },
  detalle: { type: DataTypes.JSONB, allowNull: true },
  creado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: 'auditoria_cambio',
  schema: env.dbSchema,
  timestamps: false, // creado_en lo maneja la DB
});

module.exports = AuditoriaCambio;
