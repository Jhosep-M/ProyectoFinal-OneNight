const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('ColaIntegracion', {
  id_cola: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4, field: 'id_cola' },
  consumo_id: { type: DataTypes.UUID, allowNull: false, field: 'consumo_id' },
  operacion: { type: DataTypes.STRING, allowNull: false, field: 'operacion' },
  idempotency_key: { type: DataTypes.STRING, allowNull: false, unique: true, field: 'idempotency_key' },
  intentos: { type: DataTypes.INTEGER, defaultValue: 0, field: 'intentos' },
  estado: { type: DataTypes.STRING, defaultValue: 'pendiente', field: 'estado' },
  respuesta: { type: DataTypes.TEXT, field: 'respuesta' },
  error: { type: DataTypes.TEXT, field: 'error' },
  proximo_intento: { type: DataTypes.DATE, field: 'proximo_intento' },
  ultimo_intento: { type: DataTypes.DATE, field: 'ultimo_intento' },
  creado_en: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'creado_en' },
}, { tableName: 'cola_integracion', timestamps: false });
