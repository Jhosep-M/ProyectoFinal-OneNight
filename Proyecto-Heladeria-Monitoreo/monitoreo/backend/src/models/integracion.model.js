const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { env } = require('../config/environment');

const Integracion = sequelize.define('Integracion', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  organizacion_id: { type: DataTypes.UUID, allowNull: false },
  nombre: { type: DataTypes.STRING(120), allowNull: false },
  api_key_hash: { type: DataTypes.STRING(128), allowNull: false, unique: true },
  estado: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'activo',
    validate: { isIn: [['activo', 'inactivo']] } },
  ultimo_uso_en: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'integracion',
  schema: env.dbSchema,
  timestamps: true,
  createdAt: 'creado_en',
  updatedAt: false,
});

module.exports = Integracion;
