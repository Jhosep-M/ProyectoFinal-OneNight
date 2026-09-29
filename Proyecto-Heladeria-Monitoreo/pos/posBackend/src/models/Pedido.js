const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('Pedido', {
  id_pedido: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4, field: 'id_pedido' },
  mesa_id: { type: DataTypes.UUID, field: 'mesa_id' },
  mesero_id: { type: DataTypes.UUID, field: 'mesero_id' },
  estado: { type: DataTypes.STRING, defaultValue: 'abierto', field: 'estado' },
  fecha: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'fecha' },
  fecha_cierre: { type: DataTypes.DATE, field: 'fecha_cierre' },
}, { tableName: 'pedido', timestamps: false });
