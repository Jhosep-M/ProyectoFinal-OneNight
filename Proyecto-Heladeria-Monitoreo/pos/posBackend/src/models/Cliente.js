const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('Cliente', {
  id_cliente: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4, field: 'id_cliente' },
  nombre: { type: DataTypes.STRING, allowNull: false, field: 'nombre' },
  telefono: { type: DataTypes.STRING, field: 'telefono' },
  correo: { type: DataTypes.STRING, field: 'correo' },
  puntos_fidelidad: { type: DataTypes.INTEGER, defaultValue: 0, field: 'puntos_fidelidad' },
  estado: { type: DataTypes.STRING, defaultValue: 'activo', field: 'estado' },
}, { tableName: 'cliente', timestamps: true, createdAt: 'creado_en', updatedAt: false });
