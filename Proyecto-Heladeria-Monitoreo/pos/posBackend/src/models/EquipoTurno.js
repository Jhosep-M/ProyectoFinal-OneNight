const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('EquipoTurno', {
  id_equipo_turno: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4, field: 'id_equipo_turno' },
  equipo_id: { type: DataTypes.UUID, allowNull: false, field: 'equipo_id' },
  turno_id: { type: DataTypes.UUID, allowNull: false, field: 'turno_id' },
  hora_inicio: { type: DataTypes.DATE, allowNull: false, field: 'hora_inicio' },
  hora_fin: { type: DataTypes.DATE, field: 'hora_fin' },
  estado: { type: DataTypes.STRING, defaultValue: 'activo', field: 'estado' },
}, { tableName: 'equipo_turno', timestamps: true, createdAt: 'creado_en', updatedAt: false });
