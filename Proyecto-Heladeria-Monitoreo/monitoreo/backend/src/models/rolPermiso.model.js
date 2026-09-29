const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { env } = require('../config/environment');

const RolPermiso = sequelize.define('RolPermiso', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  rol_id: { type: DataTypes.UUID, allowNull: false },
  permiso_id: { type: DataTypes.UUID, allowNull: false },
}, {
  tableName: 'rol_permiso',
  schema: env.dbSchema,
  timestamps: false, // tabla sin creado_en en el DDL
});

module.exports = RolPermiso;
