const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { env } = require('../config/environment');

const ColaProcesamiento = sequelize.define('ColaProcesamiento', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  recepcion_id: { type: DataTypes.UUID, allowNull: false, unique: true },
  estado: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'pendiente',
    validate: { isIn: [['pendiente', 'procesado', 'error']] } },
  intentos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  proximo_intento: { type: DataTypes.DATE, allowNull: true },
  ultimo_error: { type: DataTypes.TEXT, allowNull: true },
  creado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: 'cola_procesamiento',
  schema: env.dbSchema,
  timestamps: false, // creado_en lo maneja la DB
});

module.exports = ColaProcesamiento;
