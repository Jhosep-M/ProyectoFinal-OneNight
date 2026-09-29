const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { env } = require('../config/environment');

const TipoRecurso = sequelize.define('TipoRecurso', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  codigo: { type: DataTypes.STRING(10), allowNull: false, unique: true,
    validate: { isIn: [['agua', 'energia']] } },
  nombre: { type: DataTypes.STRING(60), allowNull: false },
  unidad_base: { type: DataTypes.STRING(20), allowNull: false },
}, {
  tableName: 'tipo_recurso',
  schema: env.dbSchema,
  timestamps: false, // tabla sin creado_en en el DDL
});

module.exports = TipoRecurso;
