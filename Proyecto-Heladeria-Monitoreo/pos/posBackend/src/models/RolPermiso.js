const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('RolPermiso', {
  id_rol_permiso: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4, field: 'id_rol_permiso' },
  rol_id: { type: DataTypes.UUID, allowNull: false, field: 'rol_id' },
  permiso_id: { type: DataTypes.UUID, allowNull: false, field: 'permiso_id' },
}, { tableName: 'rol_permiso', timestamps: false });
