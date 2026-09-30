const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('EntregaAlerta', {
  id_entrega: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4, field: 'id_entrega' },
  // Alineado al SQL real de routes/integrations.js:16-52
  // INSERT INTO entrega_alerta (alerta_externa_id, nivel, tipo, mensaje, estado)
  // ON CONFLICT (alerta_externa_id) DO NOTHING RETURNING id_entrega
  alerta_externa_id: { type: DataTypes.UUID, allowNull: false, unique: true, field: 'alerta_externa_id' },
  nivel: { type: DataTypes.STRING, allowNull: false, field: 'nivel' },
  // Contrato Monitoreo->POS la llama tipoRecurso; columna física `tipo`.
  tipo: { type: DataTypes.STRING, allowNull: false, field: 'tipo' },
  mensaje: { type: DataTypes.TEXT, allowNull: false, field: 'mensaje' },
  estado: { type: DataTypes.STRING, defaultValue: 'recibida', field: 'estado' },
  intentos: { type: DataTypes.INTEGER, defaultValue: 0, field: 'intentos' },
  fecha_recepcion: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'fecha_recepcion' },
  fecha_procesamiento: { type: DataTypes.DATE, allowNull: true, field: 'fecha_procesamiento' },
}, { tableName: 'entrega_alerta', timestamps: false });
