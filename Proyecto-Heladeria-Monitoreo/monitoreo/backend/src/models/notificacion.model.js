const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { env } = require('../config/environment');

const Notificacion = sequelize.define('Notificacion', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  alerta_id: { type: DataTypes.UUID, allowNull: false },
  usuario_id: { type: DataTypes.UUID, allowNull: true },
  canal: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'in_app',
    validate: { isIn: [['in_app', 'email']] } },
  estado: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'pendiente',
    validate: { isIn: [['pendiente', 'vista', 'error']] } },
  vista_en: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'notificacion',
  schema: env.dbSchema,
  timestamps: true,
  createdAt: 'creada_en', // la tabla usa "creada_en", no "creado_en"
  updatedAt: false,
});

module.exports = Notificacion;
