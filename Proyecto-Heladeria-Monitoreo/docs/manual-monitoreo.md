# Manual de Monitoreo — Agua y Energía (Heladería/Cafetería)

## 1. Qué es el proyecto

Dos sistemas separados que se hablan por API (no comparten base de datos):

- **POS**: vende, cobra (hasta pago dividido), maneja turnos de caja
  (apertura/cierre con diferencia de efectivo), pedidos y mesas, descuenta
  stock de productos e insumos de recetas, acumula puntos de clientes, aplica
  promociones, anula/devuelve restaurando inventario. Todo auditado.
- **Monitoreo** (este manual): vigila el gasto de agua y energía que genera el
  POS, clasifica consumos por umbrales, alerta excesos, mide metas de
  reducción, estima costos con tarifas y deja rastro en auditoría.

**Flujo de datos:** turno POS → worker encola el consumo → API Monitoreo
(con reintentos e idempotencia: no se duplica) → se clasifica por umbral →
si excede, genera alerta → la alerta se devuelve al POS.

## 2. Roles y permisos (regla general)

- Ver listas = permiso `*.consultar` (operador y observador entran).
- Crear / editar / activar = `*.gestionar` (solo admin).
- Si un botón responde 403 con mensaje, es falta de rol, no un bug.
- Todo filtra por la organización seleccionada en el encabezado.

## 3. Guía por pestaña (qué es, de dónde sale, pasos)

### 3.1 Dashboard (`/`)
Resumen de la organización. Al entrar pide `GET /consumo` (100),
`GET /alertas` (10) y `GET /medidores`; todo lo demás se calcula en tu
navegador. Sin auto-actualización: recarga o cambia de pestaña para ver datos
nuevos.
- **Agua/Energía hoy**: suma solo registros con fecha de hoy (hora local).
  Si marca 0,00 es que hoy no hay registros (revisa que haya consumos con
  fecha de hoy, no es error).
- **Alertas abiertas**: cuenta las no resueltas.
- **Registros**: total real de consumos (`total`, no solo los 100 traídos).
- **Consumos recientes**: los 5 primeros. Columna Medidor en `-` = el registro
  no trae medidor (normal en los que llegan del POS).
- **Alertas activas**: las 3 primeras sin confirmar, con tiempo relativo.
- **Telemetría de medidores**: tus puntos de medición (muestra 4).

### 3.2 Consumo (`/consumo`)
Historial de `registro_consumo`, 25 por página. Pasos: abre, revisa la tabla
(fecha, tipo, cantidad, unidad, clasificación con badge). Solo lectura: los
datos entran solos vía POS o registro.

### 3.3 Medidores (`/medidores`)
Tus puntos físicos de medición. Pasos:
1. Filtra por recurso si hay muchos.
2. `Nuevo medidor`: código con formato `MED-...` (único; repetido = 409),
   nombre y recurso.
3. Por fila: `Editar` (solo nombre; el código no se cambia) y
   `Activar/Inactivar`. Requiere `medidor.gestionar`.

### 3.4 Umbrales (`/umbrales`)
Reglas que clasifican el consumo en normal/alerta/critico. Pasos:
1. `Nuevo umbral`: nombre + recurso + nivel + desde/hasta.
2. Valida antes de guardar: desde < hasta y sin solape con otro rango del
   mismo recurso (el backend también lo exige).
3. Por fila: `Editar` + `Activar/Inactivar`; filtro por nivel.
   Requiere `umbral.gestionar`.

### 3.5 Alertas (`/alertas`)
Avisos generados al superar umbrales. Filtro por nivel. Columnas: fecha,
nivel (badge), tipo, mensaje y estado de entrega al POS
(`pendiente/entregada/error`). Solo lectura.

### 3.6 Metas (`/metas`)
Objetivos de reducción. Pasos: recurso + nombre + % entre 0 y 100 + fechas
con inicio ≤ fin. La barra muestra el % meta. Por fila: `Editar` +
`Activar/Inactivar`; filtro por estado. Requiere `meta.gestionar`.

### 3.7 Tarifas (`/tarifas`)
Precio del agua/kWh por período. Pasos: recurso + nombre + monto + unidad +
fechas (el backend rechaza 400 si el período se solapa). `Editar` (unidad y
recurso fijos; no tiene activar/inactivar). **Calculadora** abajo: elige
tarifa + cantidad y te da el costo. Requiere `tarifa.gestionar`.

### 3.8 Recomendaciones (`/recomendaciones`)
Acciones para ahorrar. Crear: título + descripción + prioridad (badge de
color). Filtro por estado. `Aplicar/Descartar` solo aparecen en abiertas.
Requiere `recomendacion.gestionar` para cambiar estado.

### 3.9 Reportes (`/reportes`)
Agregados del período para la org y fechas elegidas:
consumo por recurso, alertas por nivel, costo estimado (usa tu tarifa
vigente), avance de metas y top de excesos diarios.
`Descargar CSV` (solo tabla de consumo) y `PDF/Imprimir` (toda la página).

### 3.10 Organizaciones (`/organizaciones`)
Separa datos por empresa/sucursal. Verás solo las de tu membresía. Crear una
org te hace admin de ella automáticamente (nace vacía: su reporte dirá "sin
datos" hasta cargarle medidores y consumos). `Editar` nombre +
`Activar/Inactivar`. Requiere `organizacion.gestionar`. Con varias orgs,
cambia con el selector del encabezado.

### 3.11 Notificaciones (`/notificaciones`)
Tus avisos: propios + broadcast de tus orgs. Contador de pendientes,
checkbox Solo pendientes, `Marcar vista` individual o todas. Solo puedes
marcar las tuyas (otra = 403).

### 3.12 Auditoría (`/auditoria`)
Quién hizo qué: fecha, usuario, acción y detalle (el detalle objeto se ve
como JSON texto). Filtros Desde/Hasta + paginación de 25. Solo lectura.

## 4. El reporte impreso, ¿trae todo lo que cargué?

Trae los agregados (consumo, alertas, costo, metas, excesos) de la org y
fechas elegidas. **No** incluye: medidores, umbrales definidos,
recomendaciones, notificaciones, organizaciones ni auditoría (cada uno vive
en su pestaña). Lo fuera del rango de fechas no sale aunque exista.

## 5. Errores comunes (qué significan)

- **403**: falta de rol o de membresía en la org. No es bug.
- **404 en auditoría (antes)**: endpoint inexistente; ya implementado en
  backend (`GET /reportes/auditoria`).
- **429**: rate limit (100 req/15 min). Cada pestaña pedía `/recursos`;
  ahora hay caché de 60 s + 1 reintento. Si se satura, reinicia el backend
  (el contador vive en memoria) o sube `RATE_LIMIT_MAX` en dev.
- **500**: error del servidor; revisa la consola del backend (log con
  `reqId`) y el JSON de Response en DevTools.
- **Página en blanco tras cambio de código**: reinicia backend y recarga
  con Ctrl+Shift+R (el backend no recarga rutas nuevas solo).
