const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('MetodoPago', {
  id_metodo_pago: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4, field: 'id_metodo_pago' },
  nombre: { type: DataTypes.STRING, allowNull: false, field: 'nombre' },
  estado: { type: DataTypes.STRING, defaultValue: 'activo', field: 'estado' },
}, { tableName: 'metodo_pago', timestamps: false });
