const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { env } = require('../config/environment');

const RecepcionConsumoPOS = sequelize.define('RecepcionConsumoPOS', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  consumo_externo_id: { type: DataTypes.UUID, allowNull: false, unique: true },
  idempotency_key: { type: DataTypes.STRING(150), allowNull: false, unique: true },
  organizacion_id: { type: DataTypes.UUID, allowNull: false },
  punto_medicion_id: { type: DataTypes.UUID, allowNull: true },
  tipo_recurso: { type: DataTypes.STRING(10), allowNull: false,
    validate: { isIn: [['agua', 'energia']] } },
  cantidad: { type: DataTypes.DECIMAL(14, 3), allowNull: false,
    // Contrato consumption.v1: minimum 0 (turno sin equipos activos es válido).
    validate: { min: 0 } },
  unidad_medida: { type: DataTypes.STRING(20), allowNull: false },
  fecha_consumo: { type: DataTypes.DATE, allowNull: false },
  origen: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'POS' },
  estado: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'recibido',
    validate: { isIn: [['recibido', 'procesado', 'error']] } },
  recepcionado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: 'recepcion_consumo_pos',
  schema: env.dbSchema,
  timestamps: false, // recepcionado_en lo maneja la DB
});

module.exports = RecepcionConsumoPOS;
