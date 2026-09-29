const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { env } = require('../config/environment');

const Usuario = sequelize.define('Usuario', {
  id: { type: DataTypes.UUID, primaryKey: true }, // sin defaultValue: coincide con auth.uid de Supabase Auth
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  nombre: { type: DataTypes.STRING(120), allowNull: true },
  estado: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'activo',
    validate: { isIn: [['activo', 'inactivo']] } },
}, {
  tableName: 'usuario',
  schema: env.dbSchema,
  timestamps: true,
  createdAt: 'creado_en',
  updatedAt: false,
});

module.exports = Usuario;
