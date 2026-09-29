const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { env } = require('../config/environment');

const Rol = sequelize.define('Rol', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  nombre: { type: DataTypes.STRING(60), allowNull: false, unique: true },
  estado: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'activo',
    validate: { isIn: [['activo', 'inactivo']] } },
}, {
  tableName: 'rol',
  schema: env.dbSchema,
  timestamps: false, // tabla sin creado_en en el DDL
});

module.exports = Rol;
