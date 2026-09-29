const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { env } = require('../config/environment');

const MetaReduccion = sequelize.define('MetaReduccion', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  organizacion_id: { type: DataTypes.UUID, allowNull: false },
  tipo_recurso_id: { type: DataTypes.UUID, allowNull: false },
  nombre: { type: DataTypes.STRING(120), allowNull: false },
  porcentaje_reduccion: { type: DataTypes.DECIMAL(5, 2), allowNull: false,
    validate: { min: 0, max: 100 } },
  fecha_inicio: { type: DataTypes.DATEONLY, allowNull: false },
  fecha_fin: { type: DataTypes.DATEONLY, allowNull: false },
  estado: { type: DataTypes.STRING(12), allowNull: false, defaultValue: 'activo',
    validate: { isIn: [['activo', 'inactivo', 'cumplida', 'incumplida']] } },
}, {
  tableName: 'meta_reduccion',
  schema: env.dbSchema,
  timestamps: true,
  createdAt: 'creado_en',
  updatedAt: false,
});

module.exports = MetaReduccion;
