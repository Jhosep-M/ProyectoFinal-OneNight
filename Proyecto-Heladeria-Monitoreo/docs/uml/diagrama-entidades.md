# Diagrama de Entidades — POS

## Diagrama Entidad-Relación

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   usuario    │     │   rol        │     │  permiso     │
├──────────────┤     ├──────────────┤     ├──────────────┤
│ id_usuario   │     │ id_rol       │     │ id_permiso   │
│ nombre       │     │ nombre       │     │ nombre       │
│ email        │     │ descripcion  │     │ modulo       │
│ rol_id ──────┼────►│              │     │ accion       │
│ estado       │     └──────┬───────┘     └──────▲───────┘
│ creado_en    │            │                    │
└──────┬───────┘     ┌──────┴───────┐     ┌──────┴───────┐
       │             │ rol_permiso  │     │              │
       │             ├──────────────┤     │              │
       │             │ rol_id       │────►│              │
       │             │ permiso_id   │     │              │
       │             └──────────────┘     │              │
       │                                  │              │
       ▼                                  │              │
┌──────────────┐     ┌──────────────┐     │              │
│ turno_caja   │     │   venta      │     │              │
├──────────────┤     ├──────────────┤     │              │
│ id_turno     │◄────│ turno_id     │     │              │
│ usuario_id   │     │ id_venta     │     │              │
│ monto_inicial│     │ fecha        │     │              │
│ monto_final  │     │ total        │     │              │
│ diferencia   │     │ estado       │     │              │
│ estado       │     │ descuento    │     │              │
└──────────────┘     └──────┬───────┘     │              │
                            │             │              │
                     ┌──────┴───────┐     │              │
                     │ detalle_venta│     │              │
                     ├──────────────┤     │              │
                     │ id_detalle   │     │              │
                     │ venta_id ────┼────►│              │
                     │ producto_id ─┼─┐   │              │
                     │ cantidad     │ │   │              │
                     │ precio_unit  │ │   │              │
                     └──────────────┘ │   │              │
                                     │   │              │
┌──────────────┐     ┌──────────────┐ │   │              │
│  producto    │     │  insumo      │ │   │              │
├──────────────┤     ├──────────────┤ │   │              │
│ id_producto  │◄────│ receta_insumo│ │   │              │
│ nombre       │     ├──────────────┤ │   │              │
│ precio       │     │ producto_id  │─┘   │              │
│ stock        │     │ insumo_id    │────►│              │
│ stock_minimo │     │ cantidad_req │     │              │
│ categoria_id │     └──────────────┘     │              │
│ estado       │                          │              │
└──────┬───────┘     ┌──────────────┐     │              │
       │             │movimiento_inv│     │              │
       │             ├──────────────┤     │              │
       │             │ id_movimiento│     │              │
       │             │ producto_id ─┼────►│              │
       │             │ insumo_id  ──┼────►│              │
       │             │ tipo         │     │              │
       │             │ cantidad     │     │              │
       │             │ motivo       │     │              │
       │             └──────────────┘     │              │
       │                                  │              │
       ▼                                  │              │
┌──────────────┐     ┌──────────────┐     │              │
│  categoria   │     │  proveedor   │     │              │
├──────────────┤     ├──────────────┤     │              │
│ id_categoria │     │ id_proveedor │     │              │
│ nombre       │     │ nombre       │     │              │
│ estado       │     │ nit          │     │              │
└──────────────┘     │ correo       │     │              │
                     │ telefono     │     │              │
                     │ estado       │     │              │
                     └──────────────┘     │              │
                                          │              │
┌──────────────┐     ┌──────────────┐     │              │
│   mesa       │     │   pedido     │     │              │
├──────────────┤     ├──────────────┤     │              │
│ id_mesa      │◄────│ mesa_id      │     │              │
│ numero       │     │ id_pedido    │     │              │
│ estado       │     │ estado       │     │              │
└──────────────┘     │ total        │     │              │
                     │ creado_en    │     │              │
                     └──────┬───────┘     │              │
                            │             │              │
                     ┌──────┴───────┐     │              │
                     │detalle_pedido│     │              │
                     ├──────────────┤     │              │
                     │ id_detalle   │     │              │
                     │ ped_id  ─────┼────►│              │
                     │ producto_id ─┼────►│              │
                     │ cantidad     │     │              │
                     └──────────────┘     │              │
                                          │              │
┌──────────────┐     ┌──────────────┐     │              │
│  cliente     │     │movimiento_ptos│     │              │
├──────────────┤     ├──────────────┤     │              │
│ id_cliente   │◄────│ cliente_id   │     │              │
│ nombre       │     │ venta_id  ───┼────►│              │
│ telefono     │     │ puntos       │     │              │
│ correo       │     │ tipo         │     │              │
│ puntos_fidel │     │ motivo       │     │              │
│ estado       │     └──────────────┘     │              │
└──────────────┘                          │              │
                                          │              │
┌──────────────┐     ┌──────────────┐     │              │
│ promocion    │     │promo_producto│     │              │
├──────────────┤     ├──────────────┤     │              │
│ id_promocion │◄────│ promocion_id │     │              │
│ nombre       │     │ producto_id ─┼────►│              │
│ porcentaje   │     └──────────────┘     │              │
│ fecha_inicio │                          │              │
│ fecha_fin    │     ┌──────────────┐     │              │
│ estado       │     │   pago       │     │              │
└──────────────┘     ├──────────────┤     │              │
                     │ id_pago      │     │              │
                     │ venta_id ────┼────►│              │
                     │ metodo_id ───┼─┐   │              │
                     │ monto        │ │   │              │
                     │ estado       │ │   │              │
                     └──────────────┘ │   │              │
                                      │   │              │
                     ┌──────────────┐ │   │              │
                     │ metodo_pago  │◄┘   │              │
                     ├──────────────┤     │              │
                     │ id_metodo    │     │              │
                     │ nombre       │     │              │
                     │ estado       │     │              │
                     └──────────────┘     │              │
                                          │              │
                     ┌──────────────┐     │              │
                     │ devolucion   │     │              │
                     ├──────────────┤     │              │
                     │ id_devolucion│     │              │
                     │ venta_id ────┼────►│              │
                     │ producto_id ─┼────►│              │
                     │ cantidad     │     │              │
                     │ motivo       │     │              │
                     │ fecha        │     │              │
                     └──────────────┘     │              │
                                          │              │
                     ┌──────────────┐     │              │
                     │cola_integracion     │              │
                     ├──────────────┤     │              │
                     │ id_cola      │     │              │
                     │ tipo_recurso │     │              │
                     │ cantidad     │     │              │
                     │ estado       │     │              │
                     │ intentos     │     │              │
                     │ proximo_intento    │              │
                     └──────────────┘     │              │
                                          │              │
                     ┌──────────────┐     │              │
                     │  alerta_pos  │     │              │
                     ├──────────────┤     │              │
                     │ id_alerta    │     │              │
                     │ turno_id ────┼────►│              │
                     │ tipo         │     │              │
                     │ nivel        │     │              │
                     │ mensaje       │     │              │
                     │ estado       │     │              │
                     └──────────────┘     │              │
                                          │              │
                     ┌──────────────┐     │              │
                     │entrega_alerta│     │              │
                     ├──────────────┤     │              │
                     │ id_entrega   │     │              │
                     │ alerta_ext_id│     │              │
                     │ nivel        │     │              │
                     │ tipo         │     │              │
                     │ mensaje       │     │              │
                     │ estado       │     │              │
                     └──────────────┘     │              │
                                          │              │
                     ┌──────────────┐     │              │
                     │auditoria_accion     │              │
                     ├──────────────┤     │              │
                     │ id_auditoria │     │              │
                     │ usuario_id ──┼────►│              │
                     │ accion       │     │              │
                     │ entidad      │     │              │
                     │ entidad_id   │     │              │
                     │ resultado    │     │              │
                     │ detalle      │     │              │
                     │ ip           │     │              │
                     │ user_agent   │     │              │
                     │ fecha        │     │              │
                     └──────────────┘     │              │
                                          │              │
                     ┌──────────────┐     │              │
                     │equipo_consumo      │              │
                     ├──────────────┤     │              │
                     │ id_equipo    │     │              │
                     │ nombre       │     │              │
                     │ consumo_hora│     │              │
                     │ estado       │     │              │
                     └──────┬───────┘     │              │
                            │             │              │
                     ┌──────┴───────┐     │              │
                     │equipo_turno  │     │              │
                     ├──────────────┤     │              │
                     │ equipo_id    │     │              │
                     │ turno_id ────┼────►│              │
                     │ hora_inicio  │     │              │
                     │ hora_fin     │     │              │
                     └──────────────┘     │              │
                                          │              │
                     ┌──────────────┐     │              │
                     │configuracion_pos    │              │
                     ├──────────────┤     │              │
                     │ clave        │     │              │
                     │ valor        │     │              │
                     └──────────────┘     │              │
```

## Tablas principales

| Tabla | Descripción |
|-------|-------------|
| `usuario` | Usuarios del sistema (FK auth.users) |
| `rol` | Roles (cajero, mesero, supervisor, admin) |
| `permiso` | Permisos por módulo/acción |
| `rol_permiso` | Relación rol-permiso |
| `turno_caja` | Turnos de caja |
| `venta` | Ventas |
| `detalle_venta` | Items de venta |
| `pago` | Pagos |
| `metodo_pago` | Métodos de pago |
| `producto` | Productos |
| `categoria` | Categorías |
| `insumo` | Insumos |
| `receta_insumo` | Recetas producto-insumo |
| `proveedor` | Proveedores |
| `movimiento_inventario` | Movimientos de inventario |
| `mesa` | Mesas |
| `pedido` | Pedidos |
| `detalle_pedido` | Items de pedido |
| `cliente` | Clientes |
| `movimiento_puntos` | Movimientos de puntos |
| `promocion` | Promociones |
| `promocion_producto` | Productos en promoción |
| `devolucion` | Devoluciones |
| `cola_integracion` | Cola de envíos a Monitoreo |
| `alerta_pos` | Alertas recibidas de Monitoreo |
| `entrega_alerta` | Entregas de alertas |
| `auditoria_accion` | Auditoría |
| `equipo_consumo` | Equipos con consumo/hora |
| `equipo_turno` | Uso de equipo en turno |
| `configuracion_pos` | Configuración clave-valor |
