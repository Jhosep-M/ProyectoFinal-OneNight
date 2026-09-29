const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('ConfiguracionPos', {
  id_configuracion: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4, field: 'id_configuracion' },
  clave: { type: DataTypes.STRING, allowNull: false, unique: true, field: 'clave' },
  valor: { type: DataTypes.STRING, allowNull: false, field: 'valor' },
  descripcion: { type: DataTypes.TEXT, field: 'descripcion' },
  actualizado_en: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'actualizado_en' },
}, { tableName: 'configuracion_pos', timestamps: false });
