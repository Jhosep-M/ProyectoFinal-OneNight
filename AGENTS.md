# AGENTS.md

## 1. Propósito del proyecto

Este repositorio contiene un sistema compuesto por **dos aplicaciones independientes pero integradas**:

1. **POS — Heladería/Cafetería**
   - Ventas
   - Caja y turnos
   - Pedidos y mesas
   - Productos y categorías
   - Inventario e insumos
   - Recetas
   - Proveedores
   - Clientes y puntos
   - Promociones
   - Devoluciones/anulaciones
   - Auditoría
   - Reporte de consumo hacia Monitoreo

2. **Monitoreo de Agua y Energía**
   - Organizaciones
   - Puntos de medición
   - Recursos
   - Recepción de consumos del POS
   - Registro y clasificación del consumo
   - Umbrales
   - Alertas y notificaciones
   - Metas de reducción
   - Tarifas
   - Recomendaciones
   - Reportes
   - Auditoría

Los dos sistemas **NO deben compartir directamente sus tablas ni su lógica de negocio**. La comunicación entre ambos se realiza mediante APIs REST autenticadas y colas/reintentos para garantizar durabilidad e idempotencia.

---

## 2. Arquitectura general

```text
Proyecto-Heladeria-Monitoreo/
├── pos/
│   ├── frontend/          # React
│   └── backend/           # Node.js + Sequelize
├── monitoreo/
│   ├── frontend/          # React
│   └── backend/           # Node.js + Sequelize
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

### Stack

- Frontend: React + Vite.
- Backend: Node.js + Express.
- ORM: Sequelize.
- Base de datos: PostgreSQL/Supabase.
- Autenticación: Supabase Auth + JWT.
- Autorización: RBAC.
- Seguridad de base de datos: RLS.
- Contenedores: Docker.
- Orquestación: Kubernetes.
- Cloud: AWS.
- API: REST versionada (`/api/v1/...`).

---

## 3. Reglas arquitectónicas obligatorias

### 3.1 Separación POS / Monitoreo

- POS y Monitoreo son dos aplicaciones separadas.
- Cada aplicación tiene su propio frontend y backend.
- Cada sistema es propietario de sus propios datos.
- No crear FK directas entre entidades de POS y Monitoreo.
- No importar modelos internos de un sistema al otro.
- La integración se hace mediante contratos API.
- Los contratos compartidos viven en `shared/contracts/`.

### 3.2 Capas del backend

Usar esta separación:

```text
routes
  ↓
controllers
  ↓
services
  ↓
repositories
  ↓
models / database
```

Reglas:

- `routes`: define endpoints y middlewares.
- `controllers`: recibe la petición y devuelve la respuesta.
- `services`: contiene reglas de negocio.
- `repositories`: acceso a datos.
- `models`: modelos Sequelize.
- `validators`: validación de entrada.
- `middlewares`: autenticación, autorización, rate limit, errores, seguridad, etc.
- `integrations`: clientes HTTP hacia el otro sistema.
- `jobs`: workers, colas y reintentos.
- `utils`: utilidades transversales.

No colocar lógica de negocio compleja directamente en las rutas.

---

## 4. Seguridad

La seguridad es una prioridad del proyecto.

### 4.1 Autenticación

- Usar Supabase Auth para credenciales.
- Usar JWT para autenticar las solicitudes al backend.
- Validar JWT en el backend.
- No confiar en un `userId` enviado por el frontend cuando pueda obtenerse del JWT.
- Derivar la identidad autenticada desde `auth.uid()`/claims cuando corresponda.
- Implementar expiración y manejo correcto de sesión.

### 4.2 Contraseñas

La tabla pública `usuario` NO debe almacenar `passwordHash` si Supabase Auth administra las credenciales.

No implementar un segundo sistema paralelo de contraseñas.

### 4.3 RBAC

Debe existir:

```text
Usuario
Rol
Permiso
RolPermiso
```

El backend debe implementar autorización por permisos, por ejemplo:

```text
authenticate()
authorize()
requirePermission()
```

No confiar solamente en ocultar botones en React.

### 4.4 RLS

RLS es una capa adicional de seguridad en Supabase/PostgreSQL.

Las políticas deben diseñarse cuidadosamente y probarse.

No asumir que RLS sustituye la autorización del backend.

### 4.5 Secretos

Nunca subir a Git:

- `SUPABASE_SERVICE_ROLE_KEY`
- JWT secrets
- API keys
- passwords
- tokens
- credenciales AWS
- credenciales de base de datos

Usar `.env` local y Secret/Secret Manager en producción.

El frontend nunca debe contener la service-role key de Supabase.

### 4.6 API

Aplicar como mínimo:

- Helmet/security headers.
- CORS restringido.
- Rate limiting.
- Validación de payloads.
- Request IDs.
- Manejo centralizado de errores.
- Timeouts.
- Logs controlados.
- Consultas parametrizadas/Sequelize.
- Protección contra SQL injection.
- Protección contra XSS.
- Protección contra CSRF según el mecanismo de autenticación usado.
- Prevención de brute force.
- Control de privilegios.
- Validación de ownership/tenant cuando corresponda.

No devolver stack traces ni secretos al cliente.

---

## 5. Modelo de datos

### 5.1 Reglas generales

- Preferir UUID como PK.
- Emails únicos.
- FKs indexadas cuando sea necesario.
- Cantidades y dinero con `NUMERIC`, no `float`.
- Fechas consistentes.
- Estados controlados.
- No borrar físicamente operaciones históricas importantes.
- Usar transacciones para operaciones críticas.
- Validar concurrencia.

### 5.2 POS

Entidades principales:

```text
Usuario
Rol
Permiso
RolPermiso
TurnoCaja
Cliente
MovimientoPuntos
Venta
DetalleVenta
Pago
MetodoPago
Mesa
Pedido
DetallePedido
Producto
Categoria
Insumo
RecetaInsumo
Proveedor
MovimientoInventario
Promocion
PromocionProducto
Devolucion
ConsumoReportado
ColaIntegracion
EntregaAlerta
AuditoriaAccion
```

Reglas importantes:

- Una venta anulada permanece en historial.
- No eliminar físicamente ventas.
- Los pagos pueden ser divididos.
- Debe existir control de un solo turno abierto por cajero.
- Operaciones de venta e inventario deben ser transaccionales.
- Las ventas deben validar stock.
- Una venta puede descontar producto e insumos de receta.
- Las devoluciones deben restaurar inventario correctamente.
- Las anulaciones deben restaurar inventario correctamente.
- Los movimientos de inventario deben dejar trazabilidad.

### 5.3 Monitoreo

Entidades principales:

```text
Usuario
Rol
Permiso
RolPermiso
Organizacion
UsuarioOrganizacion
Integracion
PuntoMedicion
TipoRecurso
RecepcionConsumoPOS
ColaProcesamiento
RegistroConsumo
UmbralClasificacion
Alerta
Notificacion
EntregaAlerta
MetaReduccion
Tarifa
Recomendacion
AuditoriaCambio
```

Reglas importantes:

- Las organizaciones deben estar aisladas.
- Los usuarios deben asociarse a organizaciones.
- Las integraciones no almacenan API keys en texto plano.
- `apiKeyHash` debe almacenar solamente el hash.
- `codigoMedidor` debe ser único.
- Los consumos recibidos del POS deben ser idempotentes.
- No procesar dos veces el mismo `consumoExternoId`/`idempotencyKey`.
- Los umbrales deben ser válidos y no solaparse cuando la regla del negocio lo prohíba.
- Las metas deben validar porcentajes y fechas.
- Las tarifas deben validar períodos.

---

## 6. Integración POS → Monitoreo

Endpoint:

```text
POST /api/v1/integrations/consumption
```

Payload conceptual:

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

Requisitos:

- HTTPS en producción.
- Autenticación.
- Validación.
- Idempotencia.
- Registro de recepción.
- Reintentos.
- Backoff.
- Timeout.
- Máximo de intentos.
- No perder consumos si Monitoreo está temporalmente caído.

Flujo:

```text
POS
 ↓
ColaIntegracion
 ↓
Worker
 ↓
API Monitoreo
 ↓
RecepcionConsumoPOS
 ↓
ColaProcesamiento
 ↓
RegistroConsumo
 ↓
Clasificación
 ↓
Alerta
```

---

## 7. Integración Monitoreo → POS

Endpoint:

```text
POST /api/v1/integrations/alerts
```

Payload conceptual:

```json
{
  "alertaId": "uuid",
  "nivel": "critico",
  "tipoRecurso": "energia",
  "mensaje": "Consumo superior al umbral",
  "fechaGeneracion": "2026-09-21T18:00:00"
}
```

Requisitos:

- Autenticación.
- Validación.
- Idempotencia.
- Reintentos.
- Registro de entrega.
- No duplicar una alerta cuando el mismo `alertaId` sea reenviado.

---

## 8. Seguridad de SQL y funciones

Si se utilizan funciones PostgreSQL/Supabase:

- Revisar cuidadosamente `SECURITY DEFINER`.
- No exponer funciones sensibles mediante RPC sin controlar `EXECUTE`.
- Revocar ejecución pública cuando corresponda.
- Usar un rol restringido.
- Preferir lógica crítica en Node.js cuando sea más seguro y mantenible.
- No confiar en IDs enviados por el frontend para autorizar operaciones.

---

## 9. Operaciones críticas

### Registrar venta

Debe validar:

1. Usuario autenticado.
2. Usuario autorizado.
3. Turno abierto.
4. Productos existentes.
5. Stock suficiente.
6. Cantidades válidas.
7. Promociones válidas.
8. Totales.
9. Pagos.
10. Inventario.
11. Auditoría.

Debe ejecutarse de forma transaccional y con control de concurrencia.

### Anular venta

Debe:

1. Verificar que exista.
2. Verificar que esté activa.
3. Verificar autorización.
4. Restaurar stock.
5. Registrar movimientos.
6. Cambiar estado.
7. Registrar motivo.
8. Registrar auditoría.

### Devolución

Debe:

1. Verificar venta.
2. Verificar cantidades devueltas.
3. Evitar devolver más de lo vendido.
4. Restaurar inventario.
5. Registrar movimiento.
6. Registrar autorización.
7. Auditar.

### Cerrar turno

Debe:

1. Bloquear el turno.
2. Calcular ventas.
3. Calcular efectivo esperado.
4. Registrar efectivo real.
5. Calcular diferencia.
6. Registrar cierre.
7. Registrar consumo reportado cuando corresponda.
8. Generar evento para integración.
9. Auditar.

---

## 10. Git

Ramas principales:

```text
main
develop
```

Ramas de trabajo:

```text
feature/persona1-pos-ventas
feature/persona2-pos-inventario
feature/persona3-monitoreo
feature/persona4-security-integration
```

Reglas:

- No trabajar directamente sobre `main`.
- Pull Request hacia `develop`.
- Revisar cambios antes de fusionar.
- Commits descriptivos.
- No subir `.env`.
- No modificar módulos ajenos sin coordinación.
- No modificar contratos compartidos sin avisar.
- Resolver conflictos antes del merge.

### 10.1 Regla IA - Git local/remoto (estricta y obligatoria)

- La IA NO debe ejecutar ninguna operación Git que cree, modifique, mueva o publique historial, ramas, tags o estado de staging. Prohibido, incluyendo pero no limitado a: `add`, `commit`, `commit --amend`, `push`, `pull`, `fetch`, `merge`, `rebase`, `cherry-pick`, `revert`, `stash`, `tag`, `checkout -b`, `switch -c`, `branch -D/-M`, `reset`, `restore --staged`, `rm`, `mv`, `clean -fd`, `submodule update`, `worktree add/remove`, y `gh` (`repo`, `pr`, `issue`, `release`, etc.).
- La IA NO debe subir nada al repositorio remoto, ni crear/actualizar PRs, issues, releases o tags remotos.
- La IA NO debe cambiar configuración Git (`user.name`, `user.email`, `remote origin`, `core.*`, hooks, etc.) ni ejecutar `git config`.
- La IA solo puede modificar archivos en el working directory local y usar comandos de solo lectura para diagnóstico: `git status`, `git diff`, `git log`, `git remote -v`, `git branch --show-current`, `git config --list --show-origin`.
- Solo el usuario ejecuta `git add`, `git commit` y `git push`. La IA debe detenerse después de editar archivos y dejar que el usuario revise y publique manualmente.
- Si una tarea requiere publicar, la IA debe pedir autorización explícita y esperar a que el usuario lo haga por su cuenta. Sin autorización explícita, se asume denegado.

---

## 11. Responsabilidades del equipo

### Persona 1 — POS: Ventas/Caja/Pedidos

Responsable principalmente de:

```text
turno_caja
venta
detalle_venta
pago
metodo_pago
mesa
pedido
detalle_pedido
devolucion
```

Frontend:

```text
ventas
caja
pedidos
mesas
```

### Persona 2 — POS: Inventario/Productos/Clientes

Responsable principalmente de:

```text
producto
categoria
insumo
receta_insumo
proveedor
movimiento_inventario
cliente
movimiento_puntos
promocion
promocion_producto
```

Frontend:

```text
productos
inventario
insumos
recetas
proveedores
clientes
promociones
```

### Persona 3 — Monitoreo

Responsable principalmente de:

```text
organizacion
usuario_organizacion
punto_medicion
tipo_recurso
registro_consumo
umbral_clasificacion
alerta
notificacion
meta_reduccion
tarifa
recomendacion
```

Frontend:

```text
organizaciones
medidores
consumo
alertas
notificaciones
umbrales
metas
tarifas
recomendaciones
reportes
```

### Persona 4 — Seguridad/Integración/DevOps

Responsable de:

```text
Auth
JWT
RBAC
RLS coordination
API contracts
POS ↔ Monitoreo
colas
workers
reintentos
idempotencia
Docker
Kubernetes
AWS
```

Importante: Persona 4 no debe ser la única persona que escriba Dockerfiles de las aplicaciones. Cada responsable debe mantener su aplicación; Persona 4 coordina la infraestructura común y el despliegue.

---

## 12. Pruebas mínimas

### Persona 1

- Venta normal.
- Venta con varios productos.
- Pago dividido.
- Venta sin stock.
- Anulación.
- Apertura de turno.
- Cierre de turno.
- Diferencia de caja.
- Ventas simultáneas.

### Persona 2

- Entrada de inventario.
- Salida.
- Ajuste.
- Stock mínimo.
- Descuento de producto.
- Descuento de ingredientes.
- Receta.
- Devolución.
- Anulación.
- Venta concurrente del último producto.

### Persona 3

- Registrar consumo.
- Clasificar consumo.
- Umbral.
- Alerta.
- Notificación.
- Meta.
- Tarifa.
- Recomendación.
- Reportes.

### Persona 4

- JWT inválido.
- Token expirado.
- Usuario sin permiso.
- Rate limit.
- Payload inválido.
- SQL injection.
- XSS.
- CORS.
- Reintento de integración.
- Duplicación de `idempotencyKey`.
- Monitoreo caído.
- Recuperación de cola.
- Docker.
- Kubernetes.
- Health checks.

---

## 13. Prueba integrada final

La prueba más importante debe ser:

```text
1. POS abre turno.
2. POS registra ventas.
3. POS cierra turno.
4. POS genera consumo.
5. POS coloca evento en ColaIntegracion.
6. Worker envía consumo a Monitoreo.
7. Monitoreo recibe consumo.
8. Monitoreo evita duplicados.
9. Monitoreo registra consumo.
10. Monitoreo clasifica consumo.
11. Monitoreo detecta exceso.
12. Monitoreo genera alerta.
13. Monitoreo coloca alerta en cola.
14. Worker envía alerta al POS.
15. POS recibe alerta.
16. POS evita duplicarla.
17. Todo queda auditado.
```

---

## 14. Docker/Kubernetes/AWS

La infraestructura debe contemplar como mínimo:

```text
POS frontend
POS backend
Monitoreo frontend
Monitoreo backend
```

Cada servicio debe tener:

- Dockerfile.
- Health check.
- Variables de entorno.
- Límites de recursos cuando se despliegue en Kubernetes.

Kubernetes debe contemplar:

- Namespace.
- Deployment.
- Service.
- ConfigMap.
- Secrets.
- Ingress.
- Health checks.
- HPA cuando corresponda.

AWS debe contemplar:

- HTTPS/TLS.
- Load Balancer.
- WAF recomendado.
- Gestión segura de secretos.
- Logs.
- Monitoreo.

---

## 15. Reglas de desarrollo

Antes de crear una nueva entidad:

1. Revisar el modelo conceptual.
2. Revisar requisitos.
3. Verificar si ya existe una entidad equivalente.
4. Verificar relaciones.
5. Definir propietario del módulo.
6. Definir API si afecta otro sistema.
7. Definir validaciones.
8. Definir auditoría si corresponde.
9. Definir pruebas.

No crear duplicados como:

```text
Producto / ProductoPOS
Consumo / ConsumoMonitoreo
Usuario / UsuarioSistema
Alerta / AlertaPOS
```

sin una razón arquitectónica explícita.

---

## 16. Prioridad de implementación

Orden recomendado:

```text
FASE 1
Estructura + Git
        ↓
FASE 2
Base de datos + migraciones
        ↓
FASE 3
Supabase Auth + JWT + RBAC + RLS
        ↓
FASE 4
POS ventas/caja/inventario
        ↓
FASE 5
Monitoreo
        ↓
FASE 6
Contratos de integración
        ↓
FASE 7
Colas + workers + idempotencia
        ↓
FASE 8
Pruebas integradas
        ↓
FASE 9
Docker
        ↓
FASE 10
Kubernetes
        ↓
FASE 11
AWS
        ↓
FASE 12
Documentación final
```

---

## 17. Documentación

Mantener:

```text
docs/
├── uml/
├── requirements/
├── technical-manual/
├── user-manual/
└── testing/
```

La documentación debe mantenerse sincronizada con el código.

Cuando una decisión arquitectónica cambie:

1. Actualizar código.
2. Actualizar contratos.
3. Actualizar UML.
4. Actualizar documentación.
5. Agregar/actualizar pruebas.

---

## 18. Regla principal para agentes de IA

Antes de modificar código:

1. Inspeccionar el repositorio.
2. Identificar el módulo afectado.
3. Revisar modelos y migraciones existentes.
4. Revisar contratos API.
5. Revisar `.env.example`.
6. Revisar pruebas existentes.
7. No asumir nombres de columnas.
8. No inventar tablas.
9. No duplicar funcionalidad existente.
10. Mantener compatibilidad con la arquitectura definida.

Si existe código funcional, **no reemplazarlo por una implementación completamente diferente sin justificar el cambio**.

Cuando exista una inconsistencia entre código, documentación y modelo:

- identificarla explícitamente;
- no ocultarla;
- proponer la corrección;
- evitar romper otros módulos.

---

## 19. Definición de terminado

Una funcionalidad no se considera terminada solamente porque "funciona en el navegador".

Debe tener, según corresponda:

```text
Código
+ Validación
+ Autorización
+ Persistencia
+ Manejo de errores
+ Auditoría
+ Pruebas
+ Documentación
```

Para integraciones:

```text
API
+ Auth
+ Validación
+ Idempotencia
+ Timeout
+ Retry
+ Backoff
+ Logs
+ Pruebas
```

Para producción:

```text
Docker
+ Kubernetes
+ Secrets
+ HTTPS
+ Health checks
+ Logs
+ Monitoring
```

---

## 20. Principio final

El proyecto debe mantenerse:

- modular;
- seguro;
- mantenible;
- testeable;
- trazable;
- preparado para integración;
- preparado para Docker/Kubernetes/AWS;
- sin acoplamiento directo entre POS y Monitoreo;
- sin secretos en Git;
- sin lógica crítica únicamente en el frontend.
