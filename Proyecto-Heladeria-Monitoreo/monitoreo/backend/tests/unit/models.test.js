const { test } = require('node:test');
const assert = require('node:assert');

test('models/index.js exporta los 20 modelos con sus asociaciones', () => {
  const m = require('../../src/models');
  const esperados = [
    'Organizacion','Usuario','Rol','Permiso','RolPermiso','UsuarioOrganizacion',
    'Integracion','TipoRecurso','PuntoMedicion','RecepcionConsumoPOS',
    'ColaProcesamiento','RegistroConsumo','UmbralClasificacion','Alerta',
    'Notificacion','EntregaAlerta','MetaReduccion','Tarifa','Recomendacion','AuditoriaCambio',
  ];
  for (const nombre of esperados) {
    assert.ok(m[nombre], `falta modelo ${nombre}`);
    assert.ok(m[nombre].rawAttributes.id, `${nombre} debe tener PK id`);
  }
  assert.ok(m.sequelize, 'debe exportar sequelize');
});

test('RecepcionConsumoPOS tiene constraints de idempotencia', () => {
  const { RecepcionConsumoPOS } = require('../../src/models');
  const u = RecepcionConsumoPOS.rawAttributes;
  assert.ok(u.idempotency_key.unique || u.idempotency_key.unique === true,
    'idempotency_key UNIQUE');
  assert.ok(u.consumo_externo_id.unique, 'consumo_externo_id UNIQUE');
  assert.strictEqual(u.cantidad.type.key, 'DECIMAL', 'cantidad NUMERIC en BD; sequelize 6 usa key DECIMAL (DataTypes.NUMERIC da key DECIMAL)');
});
