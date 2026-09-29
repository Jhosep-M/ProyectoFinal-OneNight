const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { env } = require('../config/environment');

const UmbralClasificacion = sequelize.define('UmbralClasificacion', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  organizacion_id: { type: DataTypes.UUID, allowNull: false },
  tipo_recurso_id: { type: DataTypes.UUID, allowNull: false },
  nombre: { type: DataTypes.STRING(120), allowNull: false },
  nivel: { type: DataTypes.STRING(10), allowNull: false,
    validate: { isIn: [['normal', 'alerta', 'critico']] } },
  limite_inferior: { type: DataTypes.DECIMAL(14, 3), allowNull: false,
    validate: { min: 0 } },
  limite_superior: { type: DataTypes.DECIMAL(14, 3), allowNull: false,
    validate: { min: 0.001 } },
  estado: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'activo',
    validate: { isIn: [['activo', 'inactivo']] } },
}, {
  tableName: 'umbral_clasificacion',
  schema: env.dbSchema,
  timestamps: true,
  createdAt: 'creado_en',
  updatedAt: false,
});

module.exports = UmbralClasificacion;
