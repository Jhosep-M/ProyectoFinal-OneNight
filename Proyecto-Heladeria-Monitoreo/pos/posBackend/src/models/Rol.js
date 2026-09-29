const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('Rol', {
  id_rol: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4, field: 'id_rol' },
  nombre: { type: DataTypes.STRING, allowNull: false, unique: true, field: 'nombre' },
  descripcion: { type: DataTypes.STRING, field: 'descripcion' },
  estado: { type: DataTypes.STRING, defaultValue: 'activo', field: 'estado' },
}, { tableName: 'rol', timestamps: false });
