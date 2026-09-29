const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { env } = require('../config/environment');

const Recomendacion = sequelize.define('Recomendacion', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  organizacion_id: { type: DataTypes.UUID, allowNull: false },
  titulo: { type: DataTypes.STRING(160), allowNull: false },
  descripcion: { type: DataTypes.TEXT, allowNull: false },
  prioridad: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'media',
    validate: { isIn: [['baja', 'media', 'alta']] } },
  estado: { type: DataTypes.STRING(12), allowNull: false, defaultValue: 'abierta',
    validate: { isIn: [['abierta', 'aplicada', 'descartada']] } },
}, {
  tableName: 'recomendacion',
  schema: env.dbSchema,
  timestamps: true,
  createdAt: 'creada_en', // la tabla usa "creada_en", no "creado_en"
  updatedAt: false,
});

module.exports = Recomendacion;
