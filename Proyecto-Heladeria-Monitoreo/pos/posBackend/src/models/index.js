const { sequelize } = require('../config/database');

const Rol = require('./Rol')(sequelize);
const Permiso = require('./Permiso')(sequelize);
const RolPermiso = require('./RolPermiso')(sequelize);
const Usuario = require('./Usuario')(sequelize);
const Categoria = require('./Categoria')(sequelize);
const Producto = require('./Producto')(sequelize);
const Insumo = require('./Insumo')(sequelize);
const RecetaInsumo = require('./RecetaInsumo')(sequelize);
const Proveedor = require('./Proveedor')(sequelize);
const MovimientoInventario = require('./MovimientoInventario')(sequelize);
const Cliente = require('./Cliente')(sequelize);
const MovimientoPuntos = require('./MovimientoPuntos')(sequelize);
const Mesa = require('./Mesa')(sequelize);
const Pedido = require('./Pedido')(sequelize);
const DetallePedido = require('./DetallePedido')(sequelize);
const Venta = require('./Venta')(sequelize);
const DetalleVenta = require('./DetalleVenta')(sequelize);
const MetodoPago = require('./MetodoPago')(sequelize);
const Pago = require('./Pago')(sequelize);
const TurnoCaja = require('./TurnoCaja')(sequelize);
const Devolucion = require('./Devolucion')(sequelize);
const Promocion = require('./Promocion')(sequelize);
const PromocionProducto = require('./PromocionProducto')(sequelize);
const ConsumoReportado = require('./ConsumoReportado')(sequelize);
const ColaIntegracion = require('./ColaIntegracion')(sequelize);
const EntregaAlerta = require('./EntregaAlerta')(sequelize);
const AlertaPos = require('./AlertaPos')(sequelize);
const AuditoriaAccion = require('./AuditoriaAccion')(sequelize);
const ConfiguracionPos = require('./ConfiguracionPos')(sequelize);
const EquipoConsumo = require('./EquipoConsumo')(sequelize);
const EquipoTurno = require('./EquipoTurno')(sequelize);

const db = {
  sequelize,
  Usuario,
  Rol,
  Permiso,
  RolPermiso,
  Categoria,
  Producto,
  Insumo,
  RecetaInsumo,
  Proveedor,
  MovimientoInventario,
  Cliente,
  MovimientoPuntos,
  Mesa,
  Pedido,
  DetallePedido,
  Venta,
  DetalleVenta,
  MetodoPago,
  Pago,
  TurnoCaja,
  Devolucion,
  Promocion,
  PromocionProducto,
  ConsumoReportado,
  ColaIntegracion,
  EntregaAlerta,
  AlertaPos,
  AuditoriaAccion,
  ConfiguracionPos,
  EquipoConsumo,
  EquipoTurno,
};

// Asociaciones RBAC
Usuario.belongsTo(Rol, { foreignKey: 'rol_id', as: 'rol' });
Rol.hasMany(Usuario, { foreignKey: 'rol_id', as: 'usuarios' });
Rol.hasMany(RolPermiso, { foreignKey: 'rol_id', as: 'rolPermisos' });
RolPermiso.belongsTo(Rol, { foreignKey: 'rol_id', as: 'rol' });
Permiso.hasMany(RolPermiso, { foreignKey: 'permiso_id', as: 'rolPermisos' });
RolPermiso.belongsTo(Permiso, { foreignKey: 'permiso_id', as: 'permiso' });
Rol.belongsToMany(Permiso, { through: RolPermiso, foreignKey: 'rol_id', otherKey: 'permiso_id', as: 'permisos' });
Permiso.belongsToMany(Rol, { through: RolPermiso, foreignKey: 'permiso_id', otherKey: 'rol_id', as: 'roles' });

// Producto - Categoria
Producto.belongsTo(Categoria, { foreignKey: 'categoria_id', as: 'categoria' });
Categoria.hasMany(Producto, { foreignKey: 'categoria_id', as: 'productos' });

// Receta
RecetaInsumo.belongsTo(Producto, { foreignKey: 'producto_id', as: 'producto' });
RecetaInsumo.belongsTo(Insumo, { foreignKey: 'insumo_id', as: 'insumo' });
Producto.hasMany(RecetaInsumo, { foreignKey: 'producto_id', as: 'recetas' });
Insumo.hasMany(RecetaInsumo, { foreignKey: 'insumo_id', as: 'recetas' });

// MovimientoInventario
MovimientoInventario.belongsTo(Insumo, { foreignKey: 'insumo_id', as: 'insumo' });
MovimientoInventario.belongsTo(Proveedor, { foreignKey: 'proveedor_id', as: 'proveedor' });
MovimientoInventario.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
MovimientoInventario.belongsTo(Producto, { foreignKey: 'producto_id', as: 'producto' });
MovimientoInventario.belongsTo(Venta, { foreignKey: 'venta_id', as: 'venta' });

// Cliente - puntos
Cliente.hasMany(MovimientoPuntos, { foreignKey: 'cliente_id', as: 'movimientosPuntos' });
MovimientoPuntos.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'cliente' });
MovimientoPuntos.belongsTo(Venta, { foreignKey: 'venta_id', as: 'venta' });
Cliente.hasMany(Venta, { foreignKey: 'cliente_id', as: 'ventas' });
Venta.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'cliente' });

// Mesa - Pedido
Mesa.hasMany(Pedido, { foreignKey: 'mesa_id', as: 'pedidos' });
Pedido.belongsTo(Mesa, { foreignKey: 'mesa_id', as: 'mesa' });
Pedido.belongsTo(Usuario, { foreignKey: 'mesero_id', as: 'mesero' });
Usuario.hasMany(Pedido, { foreignKey: 'mesero_id', as: 'pedidosAtendidos' });
Pedido.hasMany(DetallePedido, { foreignKey: 'pedido_id', as: 'detalles' });
DetallePedido.belongsTo(Pedido, { foreignKey: 'pedido_id', as: 'pedido' });
DetallePedido.belongsTo(Producto, { foreignKey: 'producto_id', as: 'producto' });

// Venta
Venta.belongsTo(TurnoCaja, { foreignKey: 'turno_id', as: 'turno' });
TurnoCaja.hasMany(Venta, { foreignKey: 'turno_id', as: 'ventas' });
Venta.belongsTo(Pedido, { foreignKey: 'pedido_id', as: 'pedido' });
Venta.hasMany(DetalleVenta, { foreignKey: 'venta_id', as: 'detalles' });
DetalleVenta.belongsTo(Venta, { foreignKey: 'venta_id', as: 'venta' });
DetalleVenta.belongsTo(Producto, { foreignKey: 'producto_id', as: 'producto' });
Producto.hasMany(DetalleVenta, { foreignKey: 'producto_id', as: 'detallesVenta' });

// Pagos
Pago.belongsTo(Venta, { foreignKey: 'venta_id', as: 'venta' });
Venta.hasMany(Pago, { foreignKey: 'venta_id', as: 'pagos' });
Pago.belongsTo(MetodoPago, { foreignKey: 'metodo_pago_id', as: 'metodoPago' });
MetodoPago.hasMany(Pago, { foreignKey: 'metodo_pago_id', as: 'pagos' });

// TurnoCaja
TurnoCaja.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
Usuario.hasMany(TurnoCaja, { foreignKey: 'usuario_id', as: 'turnos' });

// Devolucion
Devolucion.belongsTo(Venta, { foreignKey: 'venta_id', as: 'venta' });
Venta.hasMany(Devolucion, { foreignKey: 'venta_id', as: 'devoluciones' });
Devolucion.belongsTo(Producto, { foreignKey: 'producto_id', as: 'producto' });
Devolucion.belongsTo(Usuario, { foreignKey: 'autorizado_por_id', as: 'autorizadoPor' });

// Promocion
PromocionProducto.belongsTo(Promocion, { foreignKey: 'promocion_id', as: 'promocion' });
PromocionProducto.belongsTo(Producto, { foreignKey: 'producto_id', as: 'producto' });
Promocion.hasMany(PromocionProducto, { foreignKey: 'promocion_id', as: 'productos' });
Producto.hasMany(PromocionProducto, { foreignKey: 'producto_id', as: 'promociones' });
Promocion.belongsToMany(Producto, { through: PromocionProducto, foreignKey: 'promocion_id', otherKey: 'producto_id', as: 'productosPromocion' });

// ConsumoReportado - ColaIntegracion
ConsumoReportado.belongsTo(TurnoCaja, { foreignKey: 'turno_id', as: 'turno' });
TurnoCaja.hasMany(ConsumoReportado, { foreignKey: 'turno_id', as: 'consumos' });
ColaIntegracion.belongsTo(ConsumoReportado, { foreignKey: 'consumo_id', as: 'consumo' });
ConsumoReportado.hasMany(ColaIntegracion, { foreignKey: 'consumo_id', as: 'colas' });

// AlertaPos
AlertaPos.belongsTo(TurnoCaja, { foreignKey: 'turno_id', as: 'turno' });
TurnoCaja.hasMany(AlertaPos, { foreignKey: 'turno_id', as: 'alertas' });
AlertaPos.belongsTo(Usuario, { foreignKey: 'atendido_por', as: 'atendidoPor' });

// AuditoriaAccion
AuditoriaAccion.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });

// EquipoConsumo - EquipoTurno
EquipoTurno.belongsTo(EquipoConsumo, { foreignKey: 'equipo_id', as: 'equipo' });
EquipoTurno.belongsTo(TurnoCaja, { foreignKey: 'turno_id', as: 'turno' });
EquipoConsumo.hasMany(EquipoTurno, { foreignKey: 'equipo_id', as: 'turnos' });
TurnoCaja.hasMany(EquipoTurno, { foreignKey: 'turno_id', as: 'equipos' });

Object.keys(db).forEach((m) => {
  if (db[m] && typeof db[m].associate === 'function') db[m].associate(db);
});

module.exports = db;
