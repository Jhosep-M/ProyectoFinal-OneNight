const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('EntregaAlerta', {
  id_entrega: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4, field: 'id_entrega' },
  alerta_id: { type: DataTypes.UUID, field: 'alerta_id' },
  organizacion_id: { type: DataTypes.UUID, field: 'organizacion_id' },
  sistema_destino: { type: DataTypes.STRING, field: 'sistema_destino' },
  tipo: { type: DataTypes.STRING, field: 'tipo' },
  intentos: { type: DataTypes.INTEGER, defaultValue: 0, field: 'intentos' },
  estado: { type: DataTypes.STRING, defaultValue: 'pendiente', field: 'estado' },
  respuesta: { type: DataTypes.TEXT, field: 'respuesta' },
  fecha_envio: { type: DataTypes.DATE, field: 'fecha_envio' },
  proximo_intento: { type: DataTypes.DATE, field: 'proximo_intento' },
  fecha_procesamiento: { type: DataTypes.DATE, field: 'fecha_procesamiento' },
}, { tableName: 'entrega_alerta', timestamps: false });
