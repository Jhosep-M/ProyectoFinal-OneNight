const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { env } = require('../config/environment');

const Organizacion = sequelize.define('Organizacion', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  nombre: { type: DataTypes.STRING(120), allowNull: false },
  nit: { type: DataTypes.STRING(30), unique: true },
  estado: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'activo',
    validate: { isIn: [['activo', 'inactivo']] } },
}, {
  tableName: 'organizacion',
  schema: env.dbSchema,
  timestamps: true,
  createdAt: 'creado_en',
  updatedAt: false,
});

module.exports = Organizacion;
