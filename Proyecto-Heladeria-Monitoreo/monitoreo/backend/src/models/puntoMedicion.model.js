const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { env } = require('../config/environment');

const PuntoMedicion = sequelize.define('PuntoMedicion', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  organizacion_id: { type: DataTypes.UUID, allowNull: false },
  tipo_recurso_id: { type: DataTypes.UUID, allowNull: false },
  codigo_medidor: { type: DataTypes.STRING(60), allowNull: false, unique: true },
  nombre: { type: DataTypes.STRING(120), allowNull: false },
  estado: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'activo',
    validate: { isIn: [['activo', 'inactivo']] } },
}, {
  tableName: 'punto_medicion',
  schema: env.dbSchema,
  timestamps: true,
  createdAt: 'creado_en',
  updatedAt: false,
});

module.exports = PuntoMedicion;
