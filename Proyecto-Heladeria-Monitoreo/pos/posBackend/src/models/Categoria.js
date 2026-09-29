const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('Categoria', {
  id_categoria: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4, field: 'id_categoria' },
  nombre: { type: DataTypes.STRING, allowNull: false, unique: true, field: 'nombre' },
  estado: { type: DataTypes.STRING, defaultValue: 'activo', field: 'estado' },
}, { tableName: 'categoria', timestamps: false });
