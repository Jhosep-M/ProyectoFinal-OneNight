# Requisitos Funcionales — POS

## Módulo Ventas

- Registrar venta normal (un producto)
- Registrar venta con varios productos
- Pago dividido (múltiples métodos)
- Rechazar venta sin stock
- Anular venta (restaura stock + auditoría)
- Devolución parcial/total (restaura stock + insumos)

## Módulo Caja y Turnos

- Abrir turno de caja (un solo turno abierto por cajero)
- Cerrar turno (calcula ventas, efectivo esperado, diferencia)
- Registrar diferencia de caja
- Generar consumo reportado al cerrar turno
- Generar evento para integración con Monitoreo

## Módulo Pedidos y Mesas

- CRUD de mesas
- Crear pedido asociado a mesa
- Cambiar estado del pedido (pendiente → en_preparacion → listo → cobrado)
- Cobrar pedido (asocia a turno de caja)

## Módulo Inventario

- CRUD de insumos
- CRUD de proveedores
- Registrar movimiento (ingreso, salida, ajuste)
- Validar stock negativo
- Alerta de stock mínimo

## Módulo Productos y Categorías

- CRUD de productos
- CRUD de categorías
- Inactivar (no borrar físicamente)
- Bloquear inactivar si hay ventas históricas

## Módulo Recetas

- Receta por producto (insumo + cantidad requerida)
- Descuento automático de insumos al vender
- Reintegro de insumos al anular/devolver

## Módulo Clientes y Puntos

- CRUD de clientes
- Acumular puntos (1 punto cada 10 de total)
- Consultar saldo y movimientos de puntos

## Módulo Promociones

- CRUD de promociones
- Asociar productos a promoción
- Validar fechas (fin ≥ inicio)
- Validar porcentaje (0-100%)

## Módulo Seguridad

- Autenticación con JWT (Supabase Auth)
- Autorización por permisos (RBAC)
- Rate limiting
- Validación de payloads (Zod)
- Auditoría de acciones
- Protección contra SQL injection

## Módulo Integración

- Enviar consumo a Monitoreo (con reintentos y backoff)
- Recibir alertas de Monitoreo (con idempotencia)
- Reintentar envíos fallidos
