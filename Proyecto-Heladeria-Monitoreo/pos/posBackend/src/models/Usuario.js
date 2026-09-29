const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('Usuario', {
  id_usuario: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
    field: 'id_usuario',
    // FK to auth.users(id) — enforced in DDL migration; kept as UUID to allow Supabase Auth linkage
    references: { model: { tableName: 'users', schema: 'auth' }, key: 'id' },
    onDelete: 'CASCADE',
  },
  nombre: { type: DataTypes.STRING, allowNull: false, field: 'nombre' },
  email: { type: DataTypes.STRING, allowNull: false, unique: true, field: 'email' },
  rol_id: { type: DataTypes.UUID, field: 'rol_id' },
  estado: { type: DataTypes.STRING, defaultValue: 'activo', field: 'estado' },
}, { tableName: 'usuario', timestamps: true, createdAt: 'creado_en', updatedAt: 'actualizado_en' });
