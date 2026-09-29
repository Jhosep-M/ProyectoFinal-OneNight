const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('TurnoCaja', {
  id_turno: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4, field: 'id_turno' },
  usuario_id: { type: DataTypes.UUID, allowNull: false, field: 'usuario_id' },
  monto_inicial: { type: DataTypes.DECIMAL(14,2), allowNull: false, field: 'monto_inicial' },
  monto_final_esperado: { type: DataTypes.DECIMAL(14,2), field: 'monto_final_esperado' },
  monto_final_real: { type: DataTypes.DECIMAL(14,2), field: 'monto_final_real' },
  diferencia: { type: DataTypes.DECIMAL(14,2), field: 'diferencia' },
  fecha_apertura: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'fecha_apertura' },
  fecha_cierre: { type: DataTypes.DATE, field: 'fecha_cierre' },
  estado: { type: DataTypes.STRING, defaultValue: 'abierto', field: 'estado' },
}, { tableName: 'turno_caja', timestamps: false });
