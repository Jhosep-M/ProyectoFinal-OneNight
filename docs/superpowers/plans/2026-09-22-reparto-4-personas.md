# Reparto en 4 bloques — POS + Monitoreo (sin estorbarse)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dividir todo lo faltante en 4 frentes independientes con ownership por carpetas, ramas y contratos congelados.

**Architecture:** POS y Monitoreo no comparten tablas ni modelos. Solo se comunican por `POST /api/v1/integrations/consumption` y `POST /api/v1/integrations/alerts` con idempotencia + colas + workers en Node (nunca HTTP desde Postgres).

**Tech Stack:** Node.js + Express + Sequelize, React + Vite, PostgreSQL/Supabase, Docker/K8s/AWS.

## Global Constraints

- No FK directas entre POS y Monitoreo.
- No importar modelos internos del otro sistema.
- Contratos en `shared/contracts/` son la única interfaz — no cambiarlos sin acuerdo de los 4.
- Dinero/cantidades con NUMERIC, no float.
- No borrar físicamente ventas ni movimientos históricos.
- No subir `.env`, service-role keys, API keys ni secretos a Git.
- Frontend nunca lleva service-role key.
- No trabajar en `main`; PR hacia `develop`.
- Cada bloque tiene rama y carpetas propias; no editar archivos de otro bloque sin coordinación.

---

## Lo que YA tienes (no rehacer)

- `posBackend/src/` scaffold por capas: `routes/`, `controllers/`, `models/` (~30 modelos), `middlewares/` (helmet, cors, rate-limit, authenticate, authorize, errorHandler), `validators/`, `integrations/monitoreoClient.js`, `jobs/colaWorker.js`, `services/` (venta, turno, devolucion), `repositories/` (3).
- `posBackend/migrations/001-v2.1-ddl.sql` + `supabase/migrations/001_v2_1_ddl.sql` (DDL V2.1).
- Diseño conceptual completo en `MEMORY.md` / `Nuevo.md` (modelos, `cerrar_turno()` borrador, `calcular_consumo_*`, RLS conceptual, RBAC).
- `posBackend/src/app.js` + `server.js` con 13 routers montados.

## Lo que FALTA (base del reparto)

- [ ] Tests: cero archivos de test en el repo.
- [ ] `monitoreo/` backend + frontend: no existe.
- [ ] `pos/frontend/`: no existe.
- [ ] `shared/contracts/`: no existe (contratos solo en docs).
- [ ] Infra: sin `docker-compose.yml` raíz, sin Dockerfiles, sin K8s, sin AWS.
- [ ] Git: solo `master`; faltan `develop` + 4 ramas feature.
- [ ] Endurecer POS: `procesar_devolucion()` no restaura insumos de receta; `cerrar_turno()` es borrador; `SECURITY DEFINER` sin `REVOKE EXECUTE`; RLS incompleto; auditoría parcial.
- [ ] Raíz: sin `.env.example`, `.gitignore`, `README.md`, `docs/testing/`.

---

## Paso 0 (Persona 4, hacer primero — 30 min, bloquea al resto)

- [ ] **Step 1: Crear `develop` y 4 ramas desde `develop`**

```bash
git checkout -b develop
git push -u origin develop
git checkout -b feature/persona1-pos-ventas
git push -u origin feature/persona1-pos-ventas
git checkout develop
git checkout -b feature/persona2-pos-inventario
git push -u origin feature/persona2-pos-inventario
git checkout develop
git checkout -b feature/Luis-monitoreo
git push -u origin feature/Luis-monitoreo
git checkout develop
git checkout -b feature/persona4-security-integration
git push -u origin feature/persona4-security-integration
```

- [ ] **Step 2: Congelar contratos v1 en `shared/contracts/`** (Persona 4 los crea, los demás solo los consumen)

Crear: `shared/contracts/consumption.v1.json`, `shared/contracts/alerts.v1.json` con los payloads de AGENTS.md §6-7 (consumoExternoId/tipoRecurso/cantidad/unidadMedida/fechaConsumo/organizacionExternaId/origen; alertaId/nivel/tipoRecurso/mensaje/fechaGeneracion). Regla: cambio de contrato = PR + aviso a los 4.

---

### Bloque 1 — Persona 1: POS Ventas / Caja / Pedidos (+ frontend POS ventas)

**Files (única dueña):**
- Modify: `posBackend/src/services/ventaService.js`, `turnoService.js`, `devolucionService.js`
- Modify: `posBackend/src/routes/sales.js`, `shifts.js`, `orders.js`, `payments.js`, `returns.js`
- Modify: `posBackend/src/controllers/` (los 5 equivalentes), `validators/sales.js`, `shifts.js`, `orders.js`
- Modify: `posBackend/src/repositories/ventaRepository.js`, `turnoRepository.js`
- Create: `pos/frontend/` (solo vistas ventas/caja/pedidos/mesas)
- Create: `posBackend/tests/ventas.*`, `turno.*`, `pagos.*`, `pedidos.*`

**No tocar:** `routes/products.js`, `inventory.js`, `customers.js`, `promotions.js`, modelos de catálogo, nada de `monitoreo/`, `shared/`, `infrastructure/`, middlewares globales.

- [ ] **Step 1: Endurecer `registrar_venta()` + `anular_venta()`** (transacción, FOR UPDATE, valida turno abierto, stock, pagos suman total, auditoría). Test: venta normal, multiproducto, pago dividido, sin stock → error, concurrencia último stock.
- [ ] **Step 2: Cerrar `cerrar_turno()`** partiendo del borrador de `Nuevo.md` §25: finalizar equipos, calcular ventas/efectivo/esperado/diferencia, alerta si supera `configuracion_pos.umbral_diferencia_caja`, generar 2 `consumo_reportado` + 2 filas `cola_integracion`, auditoría. Tests: apertura, cierre, diferencia, doble turno abierto bloqueado.
- [ ] **Step 3: Fix `procesar_devolucion()` — solo su parte:** validar cantidades vs vendidas, restaurar stock producto (la parte de insumos-receta la expone como función que implementa Persona 2, P1 solo la llama). Tests: devolución parcial, exceso rechazado, anulación restaura stock.
- [ ] **Step 4: Frontend POS ventas/caja** (React+Vite, sin secretos, userId siempre del JWT).
- [ ] **Step 5: Commit** por cada test verde hacia `feature/persona1-pos-ventas`, PR a `develop`.

**Entregable / DoD:** venta→pago→anulación/devolución→cierre con auditoría + tests verdes + sin `float` para dinero.

### Bloque 2 — Persona 2: POS Catálogo / Inventario / Clientes (+ frontend stock)

**Files (único dueño):**
- Modify: `posBackend/src/routes/products.js`, `inventory.js`, `customers.js`, `promotions.js`
- Modify: controllers/inventory, customers, promotions, products; `validators/product.js`, `inventory.js`
- Modify: `models/Producto.js`, `Categoria.js`, `Insumo.js`, `RecetaInsumo.js`, `Proveedor.js`, `MovimientoInventario.js`, `Cliente.js`, `MovimientoPuntos.js`, `Promocion*.js`, `repositories/productoRepository.js`
- Create: vistas `pos/frontend/` (productos/inventario/insumos/recetas/proveedores/clientes/promociones) — coordinar con P1 para no pisar mismos archivos (P1: carpeta `ventas/`; P2: carpeta `catalogo/`).
- Create: `posBackend/tests/inventario.*`, `recetas.*`, `promociones.*`

**No tocar:** archivos del Bloque 1, nada de `monitoreo/`, `shared/`, `infrastructure/`, middlewares globales.

- [ ] **Step 1: CRUD producto/categoría** con estado activo/inactivo (no delete físico si tiene ventas), `stockMinimo`, UNIQUE nombre categoría.
- [ ] **Step 2: Función `descontar_insumos_receta()` + reintegro proporcional en devolución** (exponer interfaz para que P1 la llame; fix pendiente de `Nuevo.md` §17). Registrar `MovimientoInventario` siempre.
- [ ] **Step 3: Entrada/salida/ajuste + proveedores (UNIQUE nit) + clientes/puntos con trazabilidad + promociones (UNIQUE promocion,producto + valida fechas/%)**.
- [ ] **Step 4: Tests:** entrada, salida, ajuste, stock mínimo, receta, venta concurrente del último producto (FOR UPDATE, sin stock negativo).
- [ ] **Step 5: Commit** hacia `feature/persona2-pos-inventario`, PR a `develop`.

**Entregable / DoD:** stock cuadra en venta/devolución/anulación + movimientos con trazabilidad + tests verdes.

### Bloque 3 — Persona 3: Monitoreo (app nueva, cero colisión)

**Files (único dueño — todo nuevo, nadie más los toca):**
- Create: `monitoreo/backend/` (réplica de capas: routes/controllers/services/repositories/models/middlewares/validators/jobs/integrations), `monitoreo/frontend/`, `database/monitoreo/` o segundo proyecto Supabase.

**No tocar:** nada de `posBackend/`, `pos/`, `shared/` (solo leer), `infrastructure/` (solo pedir a P4 lo que necesite).

- [ ] **Step 1: Modelos + migraciones** `Organizacion`, `UsuarioOrganizacion`, `Integracion` (solo `apiKeyHash`), `PuntoMedicion` (UNIQUE codigoMedidor), `TipoRecurso`, `RecepcionConsumoPOS` (UNIQUE idempotencyKey), `ColaProcesamiento`, `RegistroConsumo`, `UmbralClasificacion` (valida rangos, no solape), `Alerta`, `Notificacion`, `EntregaAlerta`, `MetaReduccion` (0-100, fechas), `Tarifa` (periodos), `Recomendacion`, `AuditoriaCambio`.
- [ ] **Step 2: `POST /api/v1/integrations/consumption`** auth + validación + idempotencia por `consumoExternoId`/`idempotencyKey` (reenvío no duplica) → `RecepcionConsumoPOS` → `ColaProcesamiento` → `RegistroConsumo` → clasificar → alerta si excede.
- [ ] **Step 3: Worker + `EntregaAlerta` → POST al POS** con reintentos (dueño del lado Monitoreo; el endpoint receptor lo expone P4/P1 según contrato alerts.v1).
- [ ] **Step 4: CRUD umbrales/metas/tarifas/recomendaciones + reportes + frontend** (organizaciones, medidores, consumo, alertas, umbrales, metas, tarifas).
- [ ] **Step 5: Tests + commit** hacia `feature/persona3-monitoreo`, PR a `develop`.

**Entregable / DoD:** recibe consumo del POS sin duplicar, clasifica, alerta, entrega al POS, todo auditado.

### Bloque 4 — Persona 4: Seguridad / Integración / DevOps (transversal, coordina)

**Files (único dueño):**
- Create: `shared/contracts/`, `infrastructure/docker/`, `infrastructure/kubernetes/`, `infrastructure/aws/`, `docker-compose.yml`, `.env.example`, `README.md`
- Modify: `posBackend/src/middlewares/`, `posBackend/src/jobs/colaWorker.js`, `integrations/monitoreoClient.js`, `routes/integrations.js`, `controllers/integrationsController.js`, RLS/policies Supabase, `REVOKE EXECUTE` de funciones `SECURITY DEFINER`.
- Create: `docs/testing/` + prueba integrada final.

**No tocar:** lógica de negocio de ventas ni de inventario (solo la envuelve con auth/rate-limit/validación); no toca `monitoreo/` salvo contrato.

- [ ] **Step 1: JWT + RBAC + RLS.** Completar `authorize.js`/`requirePermission()`, seed roles POS (cajero/mesero/inventario/supervisor/admin) + permisos de `Nuevo.md` §5, policies con `usuario_tiene_permiso()` (nunca `USING(true)`), `REVOKE EXECUTE ... FROM PUBLIC` en `registrar_venta/anular_venta/procesar_devolucion/cerrar_turno`, `search_path=public` fijo.
- [ ] **Step 2: `POST /api/v1/integrations/alerts` en POS** (idempotente por `alertaId`, no duplica) + endurecer `colaWorker` (timeout, backoff, max intentos, claim `FOR UPDATE SKIP LOCKED`).
- [ ] **Step 3: Seguridad API** (helmet/CORS/rate-limit/request-id/error central sin stack traces, validación zod, parametrizadas/Sequelize) + tests: JWT inválido/expirado, sin permiso, rate-limit, payload inválido, SQLi, XSS, CORS, idempotency duplicada, Monitoreo caído → cola → recuperación.
- [ ] **Step 4: Docker/K8s/AWS.** Dockerfiles por app (cada dueño mantiene el suyo, P4 coordina), health checks, `docker-compose.yml`, manifests (namespace/deployment/service/configmap/secrets/ingress/HPA), TLS/LB/WAF/logs.
- [ ] **Step 5: Prueba integrada final** (AGENTS.md §13, 17 pasos turno→venta→cierre→consumo→cola→Monitoreo→alerta→POS) + `docs/testing/`.

**Entregable / DoD:** contratos congelados + colas con retry/backoff + RLS/RBAC + Docker/K8s + prueba 17 pasos verde.

---

## Reglas anti-choque (las 4 firman)

1. Solo edito mis archivos; si necesito otro archivo, pido PR pequeño al dueño.
2. `shared/contracts/*.v1.json` congelado — cambio solo con acuerdo + bump a v2.
3. P1 y P2 comparten `posBackend/`: P1 no toca modelos de catálogo, P2 no toca services de venta; la función de insumos-receta se integra por interfaz acordada.
4. P3 trabaja aislado en `monitoreo/`; desbloqueado en cuanto P4 publique contratos (Paso 0).
5. `develop` siempre verde; `main` solo por release.

## Orden sugerido

```text
P4 Paso 0 (ramas + contratos, 30 min)
  → P1/P2/P3 en paralelo
  → P4 integra + prueba 17 pasos + Docker/K8s
```
