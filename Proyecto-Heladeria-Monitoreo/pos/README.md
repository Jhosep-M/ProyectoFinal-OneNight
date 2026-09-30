# POS — Heladería/Cafetería

Sistema de Punto de Venta para heladería/cafetería con gestión de ventas, caja, pedidos, inventario, clientes, promociones e integración con el sistema de Monitoreo de Agua y Energía.

---

## Tabla de Contenidos

1. [Arquitectura General](#arquitectura-general)
2. [Autenticación y Autorización](#autenticación-y-autorización)
3. [Flujo de Venta](#flujo-de-venta)
4. [Flujo de Cierre de Turno](#flujo-de-cierre-de-turno)
5. [Flujo de Devolución](#flujo-de-devolución)
6. [Flujo de Anulación de Venta](#flujo-de-anulación-de-venta)
7. [Flujo de Integración con Monitoreo](#flujo-de-integración-con-monitoreo)
8. [Flujo de Alertas desde Monitoreo](#flujo-de-alertas-desde-monitoreo)
9. [Flujo de Inventario](#flujo-de-inventario)
10. [Flujo de Pedidos y Mesas](#flujo-de-pedidos-y-mesas)
11. [Auditoría](#auditoría)
12. [Permisos](#permisos)
13. [Seguridad](#seguridad)
14. [Flujo Completo del Proyecto](#flujo-completo-del-proyecto)

---

## Arquitectura General

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React + Vite)                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │
│  │ AuthContext │  │ Permisos    │  │ apiFetch()  │           │
│  │ (Supabase)  │  │ Context     │  │ (JWT)       │           │
│  └─────────────┘  └─────────────┘  └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   BACKEND (Node.js + Express)                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Middlewares:                                         │    │
│  │  • authenticateJWT (valida token Supabase)           │    │
│  │  • authorize(permiso) (RBAC vía PG function)         │    │
│  │  • rateLimit, helmet, CORS, requestId                │    │
│  └─────────────────────────────────────────────────────┘    │
│                              │                                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Routes → Controllers → Services → PG Functions       │    │
│  │  /api/v1/sales        → ventaService    → registrar_venta()    │
│  │  /api/v1/shifts       → turnoService   → cerrar_turno()       │
│  │  /api/v1/returns      → devolucionService → procesar_devolucion() │
│  │  /api/v1/orders       → pedidos                                        │
│  │  /api/v1/payments     → pagos                                         │
│  │  /api/v1/inventory    → insumos/movimientos                        │
│  └─────────────────────────────────────────────────────┘    │
│                              │                                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Jobs: colaWorker (integración con Monitoreo)         │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              BASE DE DATOS (PostgreSQL/Supabase)             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │
│  │ auth.users  │  │ usuario     │  │ venta       │           │
│  │ (Supabase)  │  │ rol_permiso │  │ turno_caja  │           │
│  │             │  │ permiso     │  │ producto    │           │
│  └─────────────┘  └─────────────┘  │ insumo      │           │
│                                     │ consumo_    │           │
│                                     │ reportado   │           │
│                                     │ cola_       │           │
│                                     │ integracion │           │
│                                     └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

---

## Autenticación y Autorización

### Autenticación (Supabase Auth)

1. El usuario inicia sesión en el frontend con email/contraseña
2. Supabase Auth devuelve un JWT (access_token)
3. El frontend almacena la sesión en `AuthContext`
4. Cada petición al backend incluye: `Authorization: Bearer <token>`

### Autorización (RBAC)

1. El middleware `authenticateJWT` valida el token contra Supabase Auth
2. Extrae el `user.id` verificado (nunca confía en IDs del frontend)
3. El middleware `authorize(permiso)` verifica el permiso requerido
4. La verificación se hace en PostgreSQL: `usuario_tiene_permiso(:uid, :perm)`
5. Estructura: `Usuario → Rol → RolPermiso → Permiso`

---

## Flujo de Venta

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUJO DE VENTA                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. CAJERO ABRE TURNO                                       │
│     POST /api/v1/shifts                                     │
│     • Valida: turno.abrir, monto_inicial >= 0               │
│     • Solo UN turno abierto por cajero (índice parcial)     │
│     • Crea registro en turno_caja                           │
│                                                             │
│  2. CLIENTE SELECCIONA PRODUCTOS                            │
│     • El frontend muestra catálogo de productos            │
│     • Cada producto tiene: id, nombre, precio, stock        │
│     • Guía cajero: NO pegar UUID. Ir a Caja > Abrir turno, │
│       volver a Ventas: el turno se detecta solo y se muestra│
│       como "Turno #abc12345 abierto".                       │
│                                                             │
│  3. CAJERO REGISTRA VENTA (UI automática, API manual)       │
│     UI: Ventas inyecta turno_id solo desde el turno abierto │
│     POST /api/v1/sales (solo integraciones/tests)           │
│     {                                                       │
│       turno_id: "uuid",                                     │
│       items: [{producto_id, cantidad}],                     │
│       pagos: [{metodo_pago_id, monto}],                     │
│       cliente_id: "uuid" (opcional),                        │
│       descuento: 0 (opcional)                               │
│     }                                                       │
│                                                             │
│  4. BACKEND VALIDA (en PG function registrar_venta)         │
│     • JWT válido                                            │
│     • Permiso venta.crear                                   │
│     • Turno abierto y pertenece al cajero                   │
│     • Productos existen y están activos                     │
│     • Stock suficiente (FOR UPDATE)                         │
│     • Cantidades válidas (> 0)                            │
│     • Pagos: suma = total, métodos válidos                  │
│     • Promociones válidas (si aplica)                       │
│                                                             │
│  5. PG FUNCTION EJECUTA (transaccional)                     │
│     • Calcula subtotal, descuento, total                    │
│     • Descuenta stock de productos                          │
│     • Descuenta insumos de recetas                          │
│     • Registra detalle_venta                                │
│     • Registra pagos                                        │
│     • Registra movimiento_inventario                        │
│     • Registra auditoria_accion                             │
│     • Genera puntos de fidelidad (si aplica)                │
│                                                             │
│  6. RESPUESTA                                               │
│     { venta_id: "uuid" }                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Flujo de Cierre de Turno

```
┌─────────────────────────────────────────────────────────────┐
│                 FLUJO DE CIERRE DE TURNO                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. CAJERO CIERRA TURNO                                     │
│     POST /api/v1/shifts/:id/cerrar                          │
│     { monto_final_real: 1500.00 }                           │
│                                                             │
│  2. PG FUNCTION cerrar_turno EJECUTA                        │
│     • Bloquea el turno (FOR UPDATE)                         │
│     • Calcula ventas del turno                              │
│     • Calcula efectivo esperado:                            │
│       monto_inicial + ventas_efectivo - devoluciones        │
│     • Registra monto_final_real                             │
│     • Calcula diferencia                                    │
│     • Cambia estado a 'cerrado'                             │
│     • Genera consumos_reportado (si aplica)                 │
│     • Genera alertas (si aplica)                            │
│     • Registra auditoria                                    │
│                                                             │
│  3. RESPUESTA                                               │
│     {                                                       │
│       ventas: 15,                                           │
│       esperado: 1450.00,                                    │
│       diferencia: 50.00,                                    │
│       consumos: [...],                                      │
│       alertaGenerada: true/false                            │
│     }                                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Flujo de Devolución

```
┌─────────────────────────────────────────────────────────────┐
│                   FLUJO DE DEVOLUCIÓN                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. CAJERO PROCESA DEVOLUCIÓN                               │
│     POST /api/v1/returns                                    │
│     {                                                       │
│       venta_id: "uuid",                                     │
│       producto_id: "uuid",                                  │
│       cantidad: 2,                                          │
│       motivo: "Producto defectuoso"                         │
│     }                                                       │
│                                                             │
│  2. BACKEND VALIDA                                          │
│     • JWT válido                                            │
│     • Permiso devolucion.procesar                           │
│     • Venta existe y está activa                            │
│     • Producto pertenece a la venta                         │
│     • Cantidad devuelta ≤ cantidad vendida                  │
│                                                             │
│  3. PG FUNCTION procesar_devolucion EJECUTA                 │
│     • Restaura stock de producto                            │
│     • Restaura insumos de receta                            │
│     • Registra movimiento_inventario (entrada)              │
│     • Registra devolucion                                   │
│     • Registra auditoria                                    │
│                                                             │
│  4. RESPUESTA                                               │
│     { id_devolucion: "uuid", monto: 25.00 }                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Flujo de Anulación de Venta

```
┌─────────────────────────────────────────────────────────────┐
│                 FLUJO DE ANULACIÓN DE VENTA                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. CAJERO ANULA VENTA                                      │
│     POST /api/v1/sales/:id/anular                           │
│     { motivo: "Error en el pedido del cliente" }            │
│                                                             │
│  2. BACKEND VALIDA                                          │
│     • JWT válido                                            │
│     • Permiso venta.anular                                  │
│     • Venta existe                                          │
│     • Venta está activa (no anulada previamente)           │
│     • Motivo ≥ 5 caracteres                                 │
│                                                             │
│  3. PG FUNCTION anular_venta EJECUTA                        │
│     • Restaura stock de productos                           │
│     • Restaura insumos de recetas                           │
│     • Registra movimientos de inventario                    │
│     • Cambia estado a 'anulada'                             │
│     • Registra motivo_anulacion                             │
│     • Registra auditoria                                    │
│                                                             │
│  4. RESPUESTA                                               │
│     { ok: true }                                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Flujo de Integración con Monitoreo

```
┌─────────────────────────────────────────────────────────────┐
│              INTEGRACIÓN POS → MONITOREO                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. AL CERRAR TURNO                                         │
│     • Se generan consumos_reportado                        │
│     • Cada consumo se coloca en cola_integracion            │
│     • Estado inicial: 'pendiente'                           │
│                                                             │
│  2. WORKER PROCESA COLA (cada 30 segundos)                  │
│     • Selecciona registros pendientes (FOR UPDATE SKIP LOCKED)│
│     • Marca como 'procesando'                               │
│     • Envía a Monitoreo: POST /api/v1/integrations/consumption│
│     • Payload:                                              │
│       {                                                     │
│         consumoExternoId: "uuid",                           │
│         idempotencyKey: "uuid",                             │
│         tipoRecurso: "agua",                                │
│         cantidad: 125.5,                                    │
│         unidadMedida: "litros",                             │
│         fechaConsumo: "2026-09-21T18:00:00",               │
│         organizacionExternaId: "uuid",                      │
│         origen: "POS"                                       │
│       }                                                     │
│                                                             │
│  3. SI ÉXITO                                                │
│     • Estado: 'enviado'                                     │
│     • Se registra respuesta                                 │
│                                                             │
│  4. SI FALLO                                                │
│     • Reintenta con backoff: 5 min * intentos               │
│     • Máximo 10 intentos                                    │
│     • Si se agota: estado 'cancelado' (DLQ)                 │
│                                                             │
│  5. IDEMPOTENCIA                                            │
│     • Monitoreo evita duplicados por idempotencyKey         │
│     • No procesa dos veces el mismo consumo                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Flujo de Alertas desde Monitoreo

```
┌─────────────────────────────────────────────────────────────┐
│              INTEGRACIÓN MONITOREO → POS                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. MONITOREO DETECTA EXCESO                                │
│     • Consumo superior al umbral                            │
│     • Genera alerta                                         │
│                                                             │
│  2. MONITOREO ENVÍA AL POS                                  │
│     POST /api/v1/integrations/alerts                        │
│     {                                                       │
│       alertaId: "uuid",                                     │
│       nivel: "critico",                                     │
│       tipoRecurso: "energia",                               │
│       mensaje: "Consumo superior al umbral",                │
│       fechaGeneracion: "2026-09-21T18:00:00"               │
│     }                                                       │
│                                                             │
│  3. POS RECIBE Y REGISTRA                                   │
│     • Valida autenticación                                  │
│     • Evita duplicados por alertaId                         │
│     • Registra en entrega_alerta                            │
│     • Muestra alerta en el dashboard                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Flujo de Inventario

```
┌─────────────────────────────────────────────────────────────┐
│                   FLUJO DE INVENTARIO                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ESTRUCTURA:                                               │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │
│  │  Producto   │────→│ RecetaInsumo│←────│   Insumo    │   │
│  │  (stock)    │     │  (cantidad) │     │  (stock)    │   │
│  └─────────────┘     └─────────────┘     └─────────────┘   │
│                                                             │
│  AL VENDER PRODUCTO:                                        │
│  1. Descuenta stock del producto                            │
│  2. Por cada insumo en la receta:                           │
│     • Descuenta stock del insumo                            │
│     • Registra movimiento_inventario                        │
│                                                             │
│  MOVIMIENTOS DE INVENTARIO:                                 │
│  • Entrada (compra a proveedor)                             │
│  • Salida (venta, merma, ajuste)                            │
│  • Ajuste (inventario físico)                               │
│                                                             │
│  CONTROL:                                                   │
│  • Stock mínimo por producto e insumo                       │
│  • Alertas cuando stock < stock_minimo                      │
│  • Trazabilidad completa en movimiento_inventario           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Flujo de Pedidos y Mesas

```
┌─────────────────────────────────────────────────────────────┐
│                  FLUJO DE PEDIDOS/MESAS                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. MESERO CREA PEDIDO                                      │
│     • Selecciona mesa                                        │
│     • Agrega productos                                       │
│     • Estado: 'abierto'                                      │
│                                                             │
│  2. COCINA PREPARA                                          │
│     • Ve pedidos pendientes                                  │
│     • Marca como 'en preparación'                            │
│                                                             │
│  3. PEDIDO LISTO                                            │
│     • Estado: 'listo'                                        │
│     • Se entrega al cliente                                  │
│                                                             │
│  4. CIERRE DE PEDIDO                                        │
│     • Se genera venta asociada                              │
│     • Estado: 'cerrado'                                      │
│     • Se descuenta inventario                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Auditoría

Todas las acciones importantes se registran en `auditoria_accion`:

| Campo | Descripción |
|-------|-------------|
| `usuario_id` | Quién realizó la acción |
| `accion` | Tipo de acción (crear, anular, devolver, etc.) |
| `entidad` | Tabla afectada (venta, producto, etc.) |
| `entidad_id` | ID del registro afectado |
| `resultado` | Éxito o error |
| `direccion_ip` | IP del cliente |
| `user_agent` | Navegador/cliente |
| `fecha` | Timestamp |
| `detalle` | Información adicional |

---

## Permisos

| Módulo | Permisos |
|--------|----------|
| **Ventas** | `venta.consultar`, `venta.crear`, `venta.anular` |
| **Turnos** | `turno.consultar`, `turno.consultar.todos`, `turno.abrir`, `turno.cerrar` |
| **Devoluciones** | `devolucion.procesar`, `devolucion.autorizar` |
| **Productos** | `producto.consultar`, `producto.crear`, `producto.editar`, `producto.eliminar` |
| **Inventario** | `inventario.consultar`, `inventario.entrada`, `inventario.salida`, `inventario.ajuste` |
| **Clientes** | `cliente.consultar`, `cliente.crear`, `cliente.editar` |
| **Pedidos** | `pedido.consultar`, `pedido.crear`, `pedido.cerrar` |
| **Mesas** | `mesa.consultar`, `mesa.crear`, `mesa.editar` |
| **Usuarios** | `usuario.consultar`, `usuario.crear`, `usuario.editar` |
| **Auditoría** | `auditoria.consultar` |

---

## Seguridad

1. **Nunca confiar en el frontend**: El backend valida todo
2. **JWT obligatorio**: Todas las rutas requieren autenticación
3. **RBAC estricto**: Cada acción requiere permiso específico
4. **Validación en PG**: Las funciones SECURITY DEFINER validan stock, precios, etc.
5. **Transaccionalidad**: Ventas, devoluciones y anulaciones son transaccionales
6. **Auditoría completa**: Todo queda registrado
7. **Idempotencia**: Las integraciones evitan duplicados
8. **Sin secretos en el frontend**: Solo anon-key pública

---

## Flujo Completo del Proyecto

### Resumen Ejecutivo

El proyecto **Heladería-Monitoreo** es un sistema compuesto por dos aplicaciones independientes pero integradas:

1. **POS (Punto de Venta)**: Gestiona ventas, caja, pedidos, inventario, clientes y promociones de una heladería/cafetería.
2. **Monitoreo de Agua y Energía**: Gestiona organizaciones, puntos de medición, consumos, umbrales, alertas y reportes de consumo de recursos.

Ambos sistemas se comunican mediante APIs REST autenticadas con mecanismos de idempotencia, reintentos y colas para garantizar durabilidad.

---

### Flujo Integrado POS ↔ Monitoreo

```
┌─────────────────────────────────────────────────────────────┐
│                   FLUJO INTEGRADO COMPLETO                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  FASE 1: OPERACIÓN DIARIA DEL POS                           │
│  ─────────────────────────────────                          │
│  1. Cajero abre turno de caja                               │
│  2. Se registran ventas (con descuento de inventario)       │
│  3. Se procesan pedidos de mesas                            │
│  4. Se gestionan devoluciones y anulaciones                 │
│  5. Se atienden clientes y puntos de fidelidad              │
│                                                             │
│  FASE 2: CIERRE DE TURNO                                    │
│  ────────────────────────                                   │
│  6. Cajero cierra turno                                     │
│  7. Se calcula efectivo esperado vs real                    │
│  8. Se generan consumos reportados (agua, energía)          │
│  9. Los consumos se colocan en cola_integracion             │
│                                                             │
│  FASE 3: ENVÍO A MONITOREO                                  │
│  ────────────────────────                                   │
│  10. Worker procesa la cola (cada 30s)                      │
│  11. Envía consumos a Monitoreo vía API                     │
│  12. Monitoreo recibe y valida                              │
│  13. Monitoreo evita duplicados (idempotencyKey)            │
│  14. Monitoreo registra consumo                             │
│                                                             │
│  FASE 4: ANÁLISIS EN MONITOREO                              │
│  ────────────────────────────                               │
│  15. Monitoreo clasifica consumo                            │
│  16. Compara con umbrales configurados                      │
│  17. Si excede umbral → genera alerta                       │
│  18. Calcula metas de reducción                             │
│  19. Genera recomendaciones                                 │
│                                                             │
│  FASE 5: ALERTA DE VUELTA AL POS                            │
│  ──────────────────────────────                             │
│  20. Monitoreo envía alerta al POS                          │
│  21. POS recibe y registra alerta                           │
│  22. POS evita duplicados (alertaId)                        │
│  23. POS muestra alerta en dashboard                        │
│  24. Personal del POS toma acción correctiva                │
│                                                             │
│  FASE 6: AUDITORÍA Y REPORTES                               │
│  ────────────────────────────                               │
│  25. Todas las acciones quedan auditadas                    │
│  26. Se generan reportes de consumo                         │
│  27. Se analizan tendencias                                 │
│  28. Se ajustan umbrales y metas                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Diagrama de Secuencia del Flujo Crítico

```
POS                    Monitoreo
│                         │
│  1. Abrir turno         │
│  2. Registrar ventas    │
│  3. Cerrar turno        │
│  4. Generar consumos    │
│  5. Enviar consumo ────→│
│                         │ 6. Validar
│                         │ 7. Registrar
│                         │ 8. Clasificar
│                         │ 9. Comparar umbral
│                         │ 10. Generar alerta
│  11. Recibir alerta ←───│
│  12. Mostrar alerta     │
│  13. Tomar acción       │
│                         │
```

---

### Entidades Principales del POS

| Entidad | Descripción |
|---------|-------------|
| `Usuario` | Usuarios del sistema (cajeros, meseros, admin) |
| `Rol` | Roles del sistema (cajero, mesero, admin, etc.) |
| `Permiso` | Permisos por módulo (venta.crear, turno.abrir, etc.) |
| `RolPermiso` | Relación entre roles y permisos |
| `TurnoCaja` | Turnos de caja (apertura, cierre, montos) |
| `Venta` | Ventas registradas |
| `DetalleVenta` | Productos vendidos en cada venta |
| `Pago` | Pagos asociados a ventas |
| `MetodoPago` | Métodos de pago (efectivo, tarjeta, etc.) |
| `Pedido` | Pedidos de mesas |
| `DetallePedido` | Productos en cada pedido |
| `Mesa` | Mesas del local |
| `Producto` | Productos del catálogo |
| `Categoria` | Categorías de productos |
| `Insumo` | Insumos para preparación |
| `RecetaInsumo` | Recetas (producto → insumos) |
| `Proveedor` | Proveedores de insumos |
| `MovimientoInventario` | Movimientos de stock |
| `Cliente` | Clientes registrados |
| `MovimientoPuntos` | Puntos de fidelidad |
| `Promocion` | Promociones activas |
| `PromocionProducto` | Productos en promoción |
| `Devolucion` | Devoluciones procesadas |
| `ConsumoReportado` | Consumos generados para Monitoreo |
| `ColaIntegracion` | Cola de envío a Monitoreo |
| `EntregaAlerta` | Alertas recibidas de Monitoreo |
| `AlertaPos` | Alertas generadas en POS |
| `AuditoriaAccion` | Registro de auditoría |

---

### Entidades Principales del Monitoreo

| Entidad | Descripción |
|---------|-------------|
| `Organizacion` | Organizaciones cliente |
| `UsuarioOrganizacion` | Usuarios por organización |
| `Integracion` | Integraciones configuradas |
| `PuntoMedicion` | Puntos de medición |
| `TipoRecurso` | Tipos de recurso (agua, energía) |
| `RecepcionConsumoPOS` | Consumos recibidos del POS |
| `ColaProcesamiento` | Cola de procesamiento |
| `RegistroConsumo` | Consumos registrados |
| `UmbralClasificacion` | Umbrales de clasificación |
| `Alerta` | Alertas generadas |
| `Notificacion` | Notificaciones enviadas |
| `EntregaAlerta` | Entregas de alertas al POS |
| `MetaReduccion` | Metas de reducción |
| `Tarifa` | Tarifas configuradas |
| `Recomendacion` | Recomendaciones generadas |
| `AuditoriaCambio` | Auditoría de cambios |

---

### Contratos de Integración

#### POS → Monitoreo: `POST /api/v1/integrations/consumption`

```json
{
  "consumoExternoId": "uuid",
  "tipoRecurso": "agua",
  "cantidad": 125.5,
  "unidadMedida": "litros",
  "fechaConsumo": "2026-09-21T18:00:00",
  "organizacionExternaId": "uuid",
  "origen": "POS"
}
```

#### Monitoreo → POS: `POST /api/v1/integrations/alerts`

```json
{
  "alertaId": "uuid",
  "nivel": "critico",
  "tipoRecurso": "energia",
  "mensaje": "Consumo superior al umbral",
  "fechaGeneracion": "2026-09-21T18:00:00"
}
```

---

### Tecnologías

| Capa | Tecnología |
|------|------------|
| Frontend | React + Vite |
| Backend | Node.js + Express |
| ORM | Sequelize |
| Base de datos | PostgreSQL / Supabase |
| Autenticación | Supabase Auth + JWT |
| Autorización | RBAC |
| Seguridad de BD | RLS |
| Contenedores | Docker |
| Orquestación | Kubernetes |
| Cloud | AWS |
| API | REST versionada (`/api/v1/...`) |

---

### Estructura del Proyecto

```
Proyecto-Heladeria-Monitoreo/
├── pos/
│   ├── frontend/          # React + Vite
│   └── posBackend/        # Node.js + Express
├── monitoreo/
│   ├── frontend/          # React + Vite
│   └── backend/           # Node.js + Express
├── database/
│   ├── pos/
│   └── monitoreo/
├── shared/
│   ├── contracts/
│   └── docs/
├── infrastructure/
│   ├── docker/
│   ├── kubernetes/
│   └── aws/
├── docs/
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

---

### Despliegue

#### Desarrollo Local

```bash
# POS Backend
cd pos/posBackend
npm install
npm run dev

# POS Frontend
cd pos/frontend
npm install
npm run dev
```

#### Docker

```bash
docker-compose up -d
```

#### Producción (Kubernetes)

```bash
kubectl apply -f infrastructure/kubernetes/
```

---

### Variables de Entorno

Ver `.env.example` en cada módulo para la lista completa de variables requeridas.

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | URL de conexión a PostgreSQL |
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_ANON_KEY` | Anon key de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (solo backend) |
| `MONITOREO_URL` | URL del API de Monitoreo |
| `MONITOREO_API_KEY` | API key para autenticación con Monitoreo |
| `POS_ALERT_API_KEY` | API key que el POS valida al recibir alertas (mismo valor que `POS_ALERTS_API_KEY` de Monitoreo) |
| `POS_ALERTS_URL` | URL del endpoint de alertas del POS (usado por Monitoreo) |
| `ORGANIZACION_EXTERNA_ID` | ID de organización en Monitoreo |
| `PORT` | Puerto del servidor |
| `NODE_ENV` | Entorno (development/production) |
| `CORS_ORIGIN` | Origen permitido para CORS |

---

### Pruebas

```bash
# POS Backend
cd pos/posBackend
npm test

# POS Frontend
cd pos/frontend
npm test
```

---

### Contribución

1. Crear rama desde `develop`: `feature/descripcion`
2. Seguir la arquitectura definida en `AGENTS.md`
3. No trabajar directamente sobre `main`
4. Pull Request hacia `develop`
5. Revisar cambios antes de fusionar
6. No subir `.env` ni secretos

---

### Licencia

Propio — Uso interno del proyecto.
