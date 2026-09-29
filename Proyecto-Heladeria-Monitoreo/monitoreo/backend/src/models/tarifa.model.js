const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { env } = require('../config/environment');

const Tarifa = sequelize.define('Tarifa', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  organizacion_id: { type: DataTypes.UUID, allowNull: true }, // NULL = tarifa global
  tipo_recurso_id: { type: DataTypes.UUID, allowNull: false },
  nombre: { type: DataTypes.STRING(120), allowNull: false },
  monto: { type: DataTypes.DECIMAL(14, 4), allowNull: false,
    validate: { min: 0 } },
  unidad: { type: DataTypes.STRING(20), allowNull: false },
  fecha_inicio: { type: DataTypes.DATEONLY, allowNull: false },
  fecha_fin: { type: DataTypes.DATEONLY, allowNull: false },
}, {
  tableName: 'tarifa',
  schema: env.dbSchema,
  timestamps: true,
  createdAt: 'creado_en',
  updatedAt: false,
});

module.exports = Tarifa;
