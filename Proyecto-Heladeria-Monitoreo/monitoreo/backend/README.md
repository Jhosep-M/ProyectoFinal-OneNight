# Monitoreo — Backend (Agua y Energía)

## 1. Qué es

Backend del sistema de **Monitoreo de Agua y Energía**, aplicación separada del
POS. No comparte tablas ni lógica con el POS: la única comunicación entre ambos
son contratos REST autenticados (AGENTS.md §3.1, §6-§7).

- Recibe consumos del POS (`POST /api/v1/integrations/consumption`, idempotente).
- Los clasifica contra umbrales, genera alertas/notificaciones y las entrega al
  POS con reintentos.
- Expone catálogo multi-tenant (organizaciones, medidores, recursos, usuarios),
  objetivos (umbrales, metas, tarifas, recomendaciones), consultas y reportes.

Contrato machine-readable: [`docs/openapi.yaml`](./docs/openapi.yaml).

## 2. Stack

Node 24 · Express 5 · Sequelize 6 · Zod 4 · Postgres/Supabase · pino ·
`node --test` (sin framework extra).

## 3. Arranque local

```powershell
cd monitoreo/backend
copy .env.example .env   # completar DATABASE_URL y SUPABASE_*
npm install
node src/server.js       # http://localhost:4001/health
```

Frontend (dev, puerto 5174 con proxy `/api` → `http://localhost:4001`):

```powershell
cd monitoreo/frontend
npm install
npm run dev              # http://localhost:5174
```

## 4. Migraciones DDL

El esquema se aplica con Supabase MCP (`apply_migration`):

1. `database/monitoreo/001_v1_0_monitoreo_ddl.sql` — 20 tablas del schema `monitoreo`.
2. `002_seed_dev.sql` — seed de desarrollo (roles ≥ 4, permisos ≥ 20,
   2 tipos de recurso, umbrales demo agua normal/alerta/crítico).

Paso exacto del Task 2 del bloque. El backend no corre migraciones al arrancar.

## 5. Workers

Arrancan automáticamente con `server.js` y también se pueden correr manual:

```powershell
node src/jobs/processingWorker.js      # cola → registro → clasificación → alerta
node src/jobs/alertDeliveryWorker.js   # entrega al POS con lease/backoff/máx. intentos
```

- `processingWorker`: toma `cola_procesamiento`, crea `registro_consumo`,
  clasifica contra `umbral_clasificacion` y genera `alerta` + `notificacion` +
  `entrega_alerta` encolada.
- `alertDeliveryWorker`: entrega cada alerta al endpoint del POS
  (`POS_ALERTS_URL`) con timeout (`DELIVERY_TIMEOUT_MS`), backoff
  (`DELIVERY_BACKOFF_MINUTES`) y tope de intentos (`DELIVERY_MAX_INTENTOS`).

## 6. Tests

```powershell
npm run test:unit   # sin BD
npm test            # unit + integración (serializada: --test-concurrency=1)
```

- Integración requiere `MONITOREO_TEST_DATABASE_URL`; sin la variable los tests
  de BD se **saltan con aviso**, nunca fallan.
- `npm test` serializa archivos (`--test-concurrency=1`): cada archivo de
  integración ejecuta `DROP SCHEMA monitoreo_test` en su `before()` y en
  paralelo se pisarían (enmienda T5-1).

## 7. Contrato de integración

POS → Monitoreo: `POST /api/v1/integrations/consumption`

- Header: `Authorization: Bearer <apiKey>` (la BD guarda solo su sha256).
- Payload: `consumoExternoId` (uuid), `idempotencyKey` (8-120),
  `tipoRecurso` (`agua`|`energia`), `cantidad` (> 0, máx. 3 decimales),
  `unidadMedida`, `fechaConsumo`, `origen` (default `POS`),
  `organizacionExternaId` (uuid, opcional; si se envía debe coincidir).
- Códigos: `201` recepción creada · `200` duplicado (mismo `idempotencyKey` o
  `consumoExternoId`, responde `duplicado: true`) · `400` payload inválido ·
  `401` API key inválida/ausente · `403` `organizacionExternaId` no coincide.
- Garantía de idempotencia: el reenvío nunca crea una segunda recepción.

Monitoreo → POS: el receptor vive en el POS (P4 Paso 2); este backend solo
encola y entrega (`alertDeliveryWorker`). Ver `docs/openapi.yaml`.

## 8. Seguridad

- JWT de Supabase en `Authorization: Bearer`; identidad derivada del token,
  nunca de IDs del body.
- RBAC por permisos (`requirePermission('recurso.accion')`) + `scopeOrg`
  (aislamiento de tenant por `organizacionId`).
- API keys de integración: solo sha256 en BD; el secreto sale una sola vez
  (crear/rotar).
- Auditoría: las escrituras registran `auditoria_cambio`.
- Helmet + CORS restringido (`CORS_ORIGIN`) + rate limit (`RATE_LIMIT_MAX`)
  + validación Zod + request IDs + manejo centralizado de errores.
- `SUPABASE_SERVICE_ROLE_KEY` **jamás** en este repo ni en `.env.example`.

## 9. Puertos y compose (coordinación con P4)

Este bloque no edita `infrastructure/` ni `docker-compose.yml` (lo hace P4).
El compose debe exponer:

- Backend: `4001` · Frontend: `5174`.
- Env: `DATABASE_URL`, `MONITOREO_DB_SCHEMA=monitoreo`, `SUPABASE_URL`,
  `SUPABASE_ANON_KEY`, `POS_ALERTS_URL`, `POS_ALERTS_API_KEY`.

Imágenes: `monitoreo/backend/Dockerfile` (Node 24, `npm install --omit=dev`,
healthcheck a `/health`, usuario `node` no-root) y
`monitoreo/frontend/Dockerfile` multi-stage (build Vite → nginx, con
`nginx.conf` y fallback SPA para react-router).
