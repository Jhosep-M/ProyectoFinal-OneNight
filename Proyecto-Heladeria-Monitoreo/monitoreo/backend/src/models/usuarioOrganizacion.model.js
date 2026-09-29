const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { env } = require('../config/environment');

const UsuarioOrganizacion = sequelize.define('UsuarioOrganizacion', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  usuario_id: { type: DataTypes.UUID, allowNull: false },
  organizacion_id: { type: DataTypes.UUID, allowNull: false },
  rol_id: { type: DataTypes.UUID, allowNull: false },
  estado: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'activo',
    validate: { isIn: [['activo', 'inactivo']] } },
}, {
  tableName: 'usuario_organizacion',
  schema: env.dbSchema,
  timestamps: true,
  createdAt: 'creado_en',
  updatedAt: false,
});

module.exports = UsuarioOrganizacion;
