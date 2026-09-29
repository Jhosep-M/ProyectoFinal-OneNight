const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('Proveedor', {
  id_proveedor: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4, field: 'id_proveedor' },
  nombre: { type: DataTypes.STRING, allowNull: false, field: 'nombre' },
  nit: { type: DataTypes.STRING, unique: true, field: 'nit' },
  contacto: { type: DataTypes.STRING, field: 'contacto' },
  telefono: { type: DataTypes.STRING, field: 'telefono' },
  correo: { type: DataTypes.STRING, field: 'correo' },
  estado: { type: DataTypes.STRING, defaultValue: 'activo', field: 'estado' },
}, { tableName: 'proveedor', timestamps: false });
