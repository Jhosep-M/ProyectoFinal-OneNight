const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { env } = require('../config/environment');

const RegistroConsumo = sequelize.define('RegistroConsumo', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  recepcion_id: { type: DataTypes.UUID, allowNull: false, unique: true },
  organizacion_id: { type: DataTypes.UUID, allowNull: false },
  punto_medicion_id: { type: DataTypes.UUID, allowNull: true },
  tipo_recurso_id: { type: DataTypes.UUID, allowNull: false },
  tipo_recurso: { type: DataTypes.STRING(10), allowNull: false,
    validate: { isIn: [['agua', 'energia']] } },
  cantidad: { type: DataTypes.DECIMAL(14, 3), allowNull: false,
    // Contrato consumption.v1: minimum 0 (turno sin equipos activos es válido).
    validate: { min: 0 } },
  unidad_medida: { type: DataTypes.STRING(20), allowNull: false },
  fecha_consumo: { type: DataTypes.DATE, allowNull: false },
  clasificacion: { type: DataTypes.STRING(12), allowNull: false, defaultValue: 'sin_umbral',
    validate: { isIn: [['normal', 'alerta', 'critico', 'sin_umbral']] } },
  origen: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'POS' },
}, {
  tableName: 'registro_consumo',
  schema: env.dbSchema,
  timestamps: true,
  createdAt: 'creado_en',
  updatedAt: false,
});

module.exports = RegistroConsumo;
