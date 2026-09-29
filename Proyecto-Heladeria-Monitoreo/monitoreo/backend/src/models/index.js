const { sequelize } = require('../config/database');

const Organizacion = require('./organizacion.model');
const Usuario = require('./usuario.model');
const Rol = require('./rol.model');
const Permiso = require('./permiso.model');
const RolPermiso = require('./rolPermiso.model');
const UsuarioOrganizacion = require('./usuarioOrganizacion.model');
const Integracion = require('./integracion.model');
const TipoRecurso = require('./tipoRecurso.model');
const PuntoMedicion = require('./puntoMedicion.model');
const RecepcionConsumoPOS = require('./recepcionConsumoPOS.model');
const ColaProcesamiento = require('./colaProcesamiento.model');
const RegistroConsumo = require('./registroConsumo.model');
const UmbralClasificacion = require('./umbralClasificacion.model');
const Alerta = require('./alerta.model');
const Notificacion = require('./notificacion.model');
const EntregaAlerta = require('./entregaAlerta.model');
const MetaReduccion = require('./metaReduccion.model');
const Tarifa = require('./tarifa.model');
const Recomendacion = require('./recomendacion.model');
const AuditoriaCambio = require('./auditoriaCambio.model');

// --- Asociaciones (FKs lógicas dentro de monitoreo) ---
Rol.belongsToMany(Permiso, { through: RolPermiso, foreignKey: 'rol_id', otherKey: 'permiso_id', as: 'permisos' });
Permiso.belongsToMany(Rol, { through: RolPermiso, foreignKey: 'permiso_id', otherKey: 'rol_id', as: 'roles' });

UsuarioOrganizacion.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
UsuarioOrganizacion.belongsTo(Organizacion, { foreignKey: 'organizacion_id', as: 'organizacion' });
UsuarioOrganizacion.belongsTo(Rol, { foreignKey: 'rol_id', as: 'rol' });
Organizacion.belongsToMany(Usuario, { through: UsuarioOrganizacion, foreignKey: 'organizacion_id', otherKey: 'usuario_id', as: 'usuarios' });

Integracion.belongsTo(Organizacion, { foreignKey: 'organizacion_id', as: 'organizacion' });
PuntoMedicion.belongsTo(Organizacion, { foreignKey: 'organizacion_id', as: 'organizacion' });
PuntoMedicion.belongsTo(TipoRecurso, { foreignKey: 'tipo_recurso_id', as: 'tipoRecurso' });

RecepcionConsumoPOS.belongsTo(Organizacion, { foreignKey: 'organizacion_id', as: 'organizacion' });
RecepcionConsumoPOS.belongsTo(PuntoMedicion, { foreignKey: 'punto_medicion_id', as: 'puntoMedicion' });
ColaProcesamiento.belongsTo(RecepcionConsumoPOS, { foreignKey: 'recepcion_id', as: 'recepcion' });

RegistroConsumo.belongsTo(RecepcionConsumoPOS, { foreignKey: 'recepcion_id', as: 'recepcion' });
RegistroConsumo.belongsTo(Organizacion, { foreignKey: 'organizacion_id', as: 'organizacion' });
RegistroConsumo.belongsTo(TipoRecurso, { foreignKey: 'tipo_recurso_id', as: 'tipoRecurso' });
RegistroConsumo.belongsTo(PuntoMedicion, { foreignKey: 'punto_medicion_id', as: 'puntoMedicion' });

UmbralClasificacion.belongsTo(Organizacion, { foreignKey: 'organizacion_id', as: 'organizacion' });
UmbralClasificacion.belongsTo(TipoRecurso, { foreignKey: 'tipo_recurso_id', as: 'tipoRecurso' });

Alerta.belongsTo(Organizacion, { foreignKey: 'organizacion_id', as: 'organizacion' });
Alerta.belongsTo(RegistroConsumo, { foreignKey: 'registro_consumo_id', as: 'registro' });
Alerta.belongsTo(UmbralClasificacion, { foreignKey: 'umbral_id', as: 'umbral' });
Notificacion.belongsTo(Alerta, { foreignKey: 'alerta_id', as: 'alerta' });
Notificacion.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
EntregaAlerta.belongsTo(Alerta, { foreignKey: 'alerta_id', as: 'alerta' });

MetaReduccion.belongsTo(Organizacion, { foreignKey: 'organizacion_id', as: 'organizacion' });
MetaReduccion.belongsTo(TipoRecurso, { foreignKey: 'tipo_recurso_id', as: 'tipoRecurso' });
Tarifa.belongsTo(Organizacion, { foreignKey: 'organizacion_id', as: 'organizacion' });
Tarifa.belongsTo(TipoRecurso, { foreignKey: 'tipo_recurso_id', as: 'tipoRecurso' });
Recomendacion.belongsTo(Organizacion, { foreignKey: 'organizacion_id', as: 'organizacion' });

module.exports = {
  sequelize,
  Organizacion, Usuario, Rol, Permiso, RolPermiso, UsuarioOrganizacion,
  Integracion, TipoRecurso, PuntoMedicion, RecepcionConsumoPOS,
  ColaProcesamiento, RegistroConsumo, UmbralClasificacion, Alerta,
  Notificacion, EntregaAlerta, MetaReduccion, Tarifa, Recomendacion, AuditoriaCambio,
};
