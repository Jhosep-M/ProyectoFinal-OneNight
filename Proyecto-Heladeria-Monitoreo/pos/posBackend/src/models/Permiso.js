const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('Permiso', {
  id_permiso: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4, field: 'id_permiso' },
  nombre: { type: DataTypes.STRING, allowNull: false, unique: true, field: 'nombre' },
  descripcion: { type: DataTypes.STRING, field: 'descripcion' },
  modulo: { type: DataTypes.STRING, field: 'modulo' },
}, { tableName: 'permiso', timestamps: false });
