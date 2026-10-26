# Casos de Uso — POS Heladería

Documento de casos de uso del sistema POS (heladería), con su actor(es) y el permiso RBAC que habilita cada uno. Verificado contra las rutas de `pos/posBackend/src/routes/*` y las migraciones RBAC (`database/pos/migrations/002, 003, 008, 013`).

- **Alcance:** solo POS (heladería). No incluye el sistema de Monitoreo.
- **Prioridad incluida:** Alta y Media (se excluyen los de prioridad Baja).
- **Total:** 50 casos de uso (15 Alta · 35 Media).

## Actores / Roles

| Rol | Descripción |
|---|---|
| `cajero` | Caja y ventas |
| `mesero` | Pedidos y mesas |
| `inventario` | Stock, productos, insumos, proveedores |
| `supervisor` | Supervisión, anulación, cierre y auditoría |
| `admin` | Administración total |
| Worker de cola | Actor de sistema (job de integración) |
| Monitoreo | Actor de sistema externo |
| Supabase Auth | Actor de sistema externo (autenticación) |

## Convención de IDs

`CU-01`, `CU-02`, … numeración secuencial por módulo.

---

## Autenticación y Sesión

| CU | Caso de uso | Actor(es) | Permiso | Prioridad |
|---|---|---|---|---|
| CU-01 | Iniciar sesión | todos | Supabase Auth + JWT | Alta |
| CU-02 | Consultar mis permisos | todos | (autenticado) | Media |
| CU-03 | Consultar mi rol | todos | (autenticado) | Media |
| CU-04 | Ver dashboard | todos | (autenticado) | Media |

## Ventas

| CU | Caso de uso | Actor(es) | Permiso | Prioridad |
|---|---|---|---|---|
| CU-05 | Registrar venta | cajero, supervisor, admin | `venta.crear` | Alta |
| CU-06 | Consultar ventas | cajero, supervisor, admin | `venta.consultar` | Media |
| CU-07 | Anular venta | supervisor, admin | `venta.anular` | Alta |

## Pagos

| CU | Caso de uso | Actor(es) | Permiso | Prioridad |
|---|---|---|---|---|
| CU-08 | Consultar métodos de pago | cajero, supervisor, admin | `pago.consultar` | Media |
| CU-09 | Consultar pagos | cajero, supervisor, admin | `pago.consultar` | Media |
| CU-10 | Registrar pago dividido | cajero, supervisor, admin | `pago.gestionar` | Alta |

## Devoluciones (eliminado)

> CU-11 y CU-12 eliminados. La devolución parcial por producto ya no existe.
> Usar anulación de venta (CU de anulación) que restaura inventario.

## Caja y Turnos

| CU | Caso de uso | Actor(es) | Permiso | Prioridad |
|---|---|---|---|---|
| CU-13 | Abrir turno | cajero, supervisor, admin | `turno.abrir` | Alta |
| CU-14 | Consultar turnos propios | cajero, supervisor, admin | `turno.consultar` | Media |
| CU-15 | Consultar todos los turnos | supervisor, admin | `turno.consultar.todos` | Media |
| CU-16 | Cerrar turno | supervisor, admin | `turno.cerrar` | Alta |
| CU-17 | Registrar diferencia de caja | supervisor, admin | `turno.cerrar` | Alta |
| CU-18 | Generar consumo + evento de integración | sistema (worker) | — | Alta |

## Pedidos

| CU | Caso de uso | Actor(es) | Permiso | Prioridad |
|---|---|---|---|---|
| CU-19 | Consultar pedidos | cajero, mesero, supervisor, admin | `pedido.consultar` | Media |
| CU-20 | Crear pedido | cajero, mesero, supervisor, admin | `pedido.crear` | Media |
| CU-21 | Actualizar estado del pedido | supervisor, admin | `pedido.gestionar` | Media |
| CU-22 | Cobrar pedido | cajero, supervisor, admin | `venta.crear` | Alta |

## Mesas

| CU | Caso de uso | Actor(es) | Permiso | Prioridad |
|---|---|---|---|---|
| CU-23 | Consultar mesas | cajero, mesero, supervisor, admin | `mesa.consultar` | Media |
| CU-24 | Crear mesa | supervisor, admin | `mesa.gestionar` | Media |
| CU-25 | Actualizar mesa | supervisor, admin | `mesa.gestionar` | Media |

## Productos y Categorías

| CU | Caso de uso | Actor(es) | Permiso | Prioridad |
|---|---|---|---|---|
| CU-26 | Consultar productos/categorías | cajero, mesero, inventario, supervisor, admin | `producto.consultar` | Media |
| CU-27 | Gestionar producto | inventario, supervisor, admin | `producto.gestionar` | Media |
| CU-28 | Inactivar producto | inventario, supervisor, admin | `producto.gestionar` | Media |
| CU-29 | Gestionar categoría | inventario, supervisor, admin | `producto.gestionar` | Media |

## Inventario e Insumos

| CU | Caso de uso | Actor(es) | Permiso | Prioridad |
|---|---|---|---|---|
| CU-30 | Consultar inventario/insumos | inventario, supervisor, admin | `inventario.consultar` | Media |
| CU-31 | Crear/editar insumo | inventario, supervisor, admin | `inventario.movimiento` | Media |
| CU-32 | Registrar movimiento de inventario | inventario, supervisor, admin | `inventario.movimiento` | Alta |
| CU-33 | Consultar movimientos | inventario, supervisor, admin | `inventario.consultar` | Media |
| CU-34 | Alerta de stock mínimo | inventario, supervisor, admin | `inventario.consultar` | Alta |
| CU-35 | Consultar proveedores | inventario, supervisor, admin | `inventario.consultar` | Media |
| CU-36 | Gestionar proveedor | inventario, supervisor, admin | `inventario.movimiento` | Media |

## Recetas

| CU | Caso de uso | Actor(es) | Permiso | Prioridad |
|---|---|---|---|---|
| CU-37 | Consultar receta | cajero, mesero, inventario, supervisor, admin | `producto.consultar` | Media |
| CU-38 | Gestionar receta | inventario, supervisor, admin | `producto.gestionar` | Media |

## Clientes y Puntos

| CU | Caso de uso | Actor(es) | Permiso | Prioridad |
|---|---|---|---|---|
| CU-39 | Consultar clientes | cajero, inventario, supervisor, admin | `cliente.consultar` | Media |
| CU-40 | Gestionar cliente | supervisor, admin | `cliente.gestionar` | Media |
| CU-41 | Ajustar puntos | supervisor, admin | `cliente.gestionar` | Media |
| CU-42 | Consultar saldo/historial de puntos | cajero, inventario, supervisor, admin | `cliente.consultar` | Media |

## Promociones

| CU | Caso de uso | Actor(es) | Permiso | Prioridad |
|---|---|---|---|---|
| CU-43 | Consultar promociones | inventario, supervisor, admin | `promocion.consultar` | Media |
| CU-44 | Gestionar promociones | supervisor, admin | `promocion.gestionar` | Media |
| CU-45 | Asociar productos a promoción | supervisor, admin | `promocion.gestionar` | Media |

## Integración con Monitoreo

| CU | Caso de uso | Actor(es) | Permiso | Prioridad |
|---|---|---|---|---|
| CU-46 | Consultar cola de integración | supervisor, admin | `integracion.consultar` | Media |
| CU-47 | Consultar alertas recibidas | cajero, supervisor, admin | `alerta.consultar` | Media |
| CU-48 | Enviar consumo a Monitoreo | sistema (worker) | — | Alta |
| CU-49 | Recibir alerta (idempotente) | admin, Monitoreo | `alerta.recibir` | Alta |

## Auditoría

| CU | Caso de uso | Actor(es) | Permiso | Prioridad |
|---|---|---|---|---|
| CU-50 | Consultar auditoría | supervisor, admin | `auditoria.consultar` | Alta |

---

## Resumen

- **Total Alta + Media:** 50 casos de uso.
- **Prioridad Alta (15):** CU-01, CU-05, CU-07, CU-10, CU-12, CU-13, CU-16, CU-17, CU-18, CU-22, CU-32, CU-34, CU-48, CU-49, CU-50.
- **Prioridad Media (35):** el resto.

## Hallazgos RBAC

Inconsistencias detectadas entre el código/RBAC y la documentación:

- `turno.cerrar` lo tienen **solo supervisor y admin**. El `cajero` puede **abrir** turno (CU-13) pero no cerrarlo (CU-16), aunque el manual de usuario describe que sí puede.
- `cajero` puede **crear** pedidos (CU-20, `pedido.crear`) pero **no** cambiar su estado (CU-21, `pedido.gestionar` = supervisor/admin).
- `inventario` puede **ver** promociones (CU-43, `promocion.consultar`) pero no gestionarlas.
- `alerta.recibir` (POST, CU-49) es solo `admin`; `alerta.consultar` (GET, CU-47) incluye cajero/supervisor/admin.
- `mesero` no tiene permisos de pagos ni de ventas: solo pedidos, mesas, productos (consulta) y recetas (consulta).

## Diagrama de casos de uso (draw.io)

El prompt para generar el diagrama UML de casos de uso (solo Alta + Media) se entrega por separado; este documento no incluye el diagrama, solo la especificación de los casos de uso.
