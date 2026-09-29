const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('Mesa', {
  id_mesa: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4, field: 'id_mesa' },
  numero: { type: DataTypes.INTEGER, allowNull: false, unique: true, field: 'numero' },
  estado: { type: DataTypes.STRING, defaultValue: 'disponible', field: 'estado' },
}, { tableName: 'mesa', timestamps: false });
