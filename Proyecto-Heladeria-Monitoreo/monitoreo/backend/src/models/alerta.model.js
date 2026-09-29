const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { env } = require('../config/environment');

const Alerta = sequelize.define('Alerta', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  organizacion_id: { type: DataTypes.UUID, allowNull: false },
  registro_consumo_id: { type: DataTypes.UUID, allowNull: true },
  umbral_id: { type: DataTypes.UUID, allowNull: true },
  nivel: { type: DataTypes.STRING(10), allowNull: false,
    validate: { isIn: [['alerta', 'critico']] } },
  tipo_recurso: { type: DataTypes.STRING(10), allowNull: false,
    validate: { isIn: [['agua', 'energia']] } },
  mensaje: { type: DataTypes.TEXT, allowNull: false },
  fecha_generacion: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  estado: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'pendiente',
    validate: { isIn: [['pendiente', 'entregada', 'error']] } },
}, {
  tableName: 'alerta',
  schema: env.dbSchema,
  timestamps: true,
  createdAt: 'creado_en',
  updatedAt: false,
});

module.exports = Alerta;
