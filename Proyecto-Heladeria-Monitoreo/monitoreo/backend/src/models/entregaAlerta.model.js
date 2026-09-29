const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { env } = require('../config/environment');

const EntregaAlerta = sequelize.define('EntregaAlerta', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  alerta_id: { type: DataTypes.UUID, allowNull: false, unique: true },
  estado: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'pendiente',
    validate: { isIn: [['pendiente', 'enviada', 'error']] } },
  intentos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  proximo_intento: { type: DataTypes.DATE, allowNull: true },
  ultimo_error: { type: DataTypes.TEXT, allowNull: true },
  creada_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: 'entrega_alerta',
  schema: env.dbSchema,
  timestamps: false, // creada_en lo maneja la DB
});

module.exports = EntregaAlerta;
