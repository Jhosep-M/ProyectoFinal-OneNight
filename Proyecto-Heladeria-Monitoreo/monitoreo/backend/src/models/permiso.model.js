const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { env } = require('../config/environment');

const Permiso = sequelize.define('Permiso', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  nombre: { type: DataTypes.STRING(80), allowNull: false, unique: true },
}, {
  tableName: 'permiso',
  schema: env.dbSchema,
  timestamps: false, // tabla sin creado_en en el DDL
});

module.exports = Permiso;
