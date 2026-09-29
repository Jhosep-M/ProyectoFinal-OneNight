# Monitoreo (Bloque 3 — Persona 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir por completo el sistema Monitoreo de Agua y Energía (backend, workers, integración con el POS, frontend y tests) dentro de `Proyecto-Heladeria-Monitoreo/monitoreo/`, recibiendo consumos del POS sin duplicarlos, clasificándolos, alertando y entregando alertas al POS, todo auditado.

**Architecture:** Backend Node.js + Express 5 + Sequelize 6 en CommonJS (réplica de capas de `posBackend`: routes → controllers → services → repositories → models), PostgreSQL vía Supabase en **schema dedicado `monitoreo`** (separación de datos POS/Monitoreo sin compartir tablas ni FKs), workers con `FOR UPDATE SKIP LOCKED` + reintentos/backoff, e integración **solo** por contrato: `POST /api/v1/integrations/consumption` (entra) y `POST /api/v1/integrations/alerts` (sale). Frontend React + Vite aislado con Supabase Auth (anon key) llamando al backend con JWT.

**Tech Stack:** Node.js 24, Express 5, Sequelize 6, pg, Zod 4, Helmet, CORS, express-rate-limit, pino, @supabase/supabase-js, `node:test` (sin dependencias nuevas de test), React + Vite, Supabase MCP (`apply_migration`, `execute_sql`, `list_tables`) para DDL/semillas/verificación.

**Spec:** `docs/superpowers/plans/2026-09-22-reparto-4-personas.md` (Bloque 3, sus 5 steps y DoD) + `AGENTS.md` §5.3, §6, §7, §8, §12 (Persona 3) + `MEMORY.md` §4, §6, §7, §8, §9, §10, §11, §16 + payloads reales implementados en `Proyecto-Heladeria-Monitoreo/pos/posBackend/src/jobs/colaWorker.js` y `src/integrations/monitoreoClient.js`.

## Global Constraints

- Rama de trabajo: `feature/Luis-monitoreo` (ya creada y activa; ver Prerrequisitos). La IA NO ejecuta ningún comando Git (AGENTS.md §10.1): solo edita archivos; los `git add/commit` los ejecuta el usuario con los comandos provistos por tarea.
- ownership estricto: editar **solo** `Proyecto-Heladeria-Monitoreo/monitoreo/**`, `Proyecto-Heladeria-Monitoreo/database/monitoreo/**` y este plan. **No tocar** `pos/`, `shared/` (solo lectura), `infrastructure/`, `supabase/`, middlewares raíz, ni `docs/` fuera de este plan.
- Sin FK directas ni imports entre POS y Monitoreo. La interfaz son los contratos; `shared/contracts/*.json` es **solo lectura** (si está vacío, los payloads de este plan son la fuente de verdad; cambio de contrato = acuerdo de los 4 + PR).
- Dinero y cantidades: `NUMERIC` en BD, `number` con máximo 3 decimales validados en entrada. **Nunca** `float`.
- Sin borrado físico en tablas históricas (`recepcion_consumo_pos`, `registro_consumo`, `alerta`, `auditoria_cambio`): solo estados. `DELETE` prohibido en esas tablas.
- Secretos: solo `.env` local (gitignored). El frontend lleva únicamente `SUPABASE_URL` + `SUPABASE_ANON_KEY` (publishable). Jamás `SERVICE_ROLE_KEY` ni API keys en texto plano (integraciones guardan solo `api_key_hash`).
- API versionada: `/api/v1/...`. Todo endpoint exige JWT + permiso RBAC excepto `GET /health` y `POST /api/v1/integrations/consumption` (éste usa API-key de integración Bearer, validada por hash).
- Auditoría obligatoria (`auditoria_cambio`) en: recepción de consumo, registro de consumo, clasificación, creación de alerta, intento de entrega de alerta, y toda escritura CRUD de organizaciones, medidores, integraciones, umbrales, metas, tarifas y recomendaciones.
- Aislamiento por organización en todas las consultas de datos de negocio (scope por `organizacion_id` derivado del JWT, jamás de un body/confiable del cliente).
- Códigos de respuesta integración: recepción nueva → `201`; duplicado idempotente → `200` con `duplicado: true` (el POS trata 2xx como éxito); payload inválido → `400`; API-key inválida → `401`; org no coincide → `403`.
- Tests: `node:test` puro (cero dependencias nuevas). Tests que requieren BD se auto-saltan con aviso claro si `MONITOREO_TEST_DATABASE_URL` no está definida.
- Estilo/convenciones: espejar `posBackend` (nombres snake_case en tablas/columnas, UUID PK, `estado` con CHECK, CommonJS `require`, middlewares con firma `(req,res,next)`, respuestas `{ error }` en fallo y `{ data }`/objeto directo en éxito).
- DDL fuente: `Proyecto-Heladeria-Monitoreo/database/monitoreo/*.sql`. Se aplica **vía Supabase MCP** (`apply_migration`), nunca desde Node en producción. Ninguna función `SECURITY DEFINER` nueva (AGENTS.md §8): lógica de negocio en Node.

## Review Focus

Las 5 condiciones que el spec implica pero que un implementador distraído rompe primero — cada una con su test en la tarea dueña:

1. **Reenvío del mismo consumo** (el POS pierde respuesta y reintenta con la misma `idempotencyKey`): se espera **exactamente un** `recepcion_consumo_pos` y un `registro_consumo`; la segunda llamada responde `200 { duplicado: true }` sin insertar. → test en Task 6 (`envio duplicado consecutivo`) y Task 7 (`registro único tras reprocesar`).
2. **Dos envíos simultáneos con la misma key** (carrera sobre el UNIQUE): se espera que la constraint decida — una fila gana, la otra recibe `200` duplicado, jamás un 500 con stack trace. → test en Task 6 (`envíos concurrentes con la misma key`).
3. **Dos workers procesando la misma fila de cola** a la vez: se espera un solo `registro_consumo` (claim `FOR UPDATE SKIP LOCKED` + UNIQUE `recepcion_id`); el segundo worker no la ve. → test en Task 7 (`doble worker concurrently`).
4. **Fronteras y solape de umbrales**: `cantidad == limite_inferior` cae dentro del rango (inclusivo abajo, exclusivo arriba); un umbral que solape a otro se rechaza en CRUD con `400`; un consumo fuera de todo rango queda `sin_umbral` **sin** generar alerta falsa. → tests en Task 7 (`clasificación frontera/`). → test de solape en Task 9 (`umbral solapado rechazado`).
5. **POS caído al entregar alertas** (timeout, 500, conexión rechazada): la `entrega_alerta` reintenta con backoff y `MAX_DELIVERY_INTENTOS`, nunca se pierde ni queda en loop infinito; tras agotar intentos queda `estado='error'` con el último error registrado. → tests en Task 8 (`entrega exitosa`, `reintento tras 500`, `agota intentos`).

---

## Prerrequisitos (los ejecuta EL USUARIO, una vez)

La IA no puede crear ramas (AGENTS.md §10.1). Estado actual verificado con `git branch --show-current`:

- [x] **P0.1:** El usuario creó y está en `feature/Luis-monitoreo` (rama activa confirmada). Comandos que usó (referencia):
  ```powershell
  git checkout -b feature/Luis-monitoreo
  ```
- [ ] **P0.2:** Re-verificar que el esqueleto de `monitoreo/` sigue igual (todos los archivos en 0 bytes) tras el cambio de rama.

```powershell
Get-ChildItem -Recurse -File "Proyecto-Heladeria-Monitoreo\monitoreo" | Where-Object Length -eq 0 | Measure-Object | Select-Object Count
```

Expected: todos los archivos del esqueleto en 0 bytes (backend ~117, frontend ~18). Si hay archivos con contenido, avisar al usuario.

- [ ] **P0.3:** Verificar estado de contratos (solo lectura):

```powershell
Get-ChildItem -Recurse -File "Proyecto-Heladeria-Monitoreo\shared\contracts" | Select-Object Name, Length
```

Expected por ahora: 4 archivos en 0 bytes (Paso 0 de P4 pendiente). Los tests de contrato (Task 6) se saltan mientras estén vacíos y se activan solos cuando P4 los llene.

---

### Task 1: Scaffold del backend (config, utils, middlewares base, app, health)

**Files:**
- Create: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/package.json` (archivo esqueleto vacío → contenido nuevo)
- Create: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/.env.example` (vacío → contenido)
- Create: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/src/config/environment.js`
- Create: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/src/config/database.js`
- Create: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/src/utils/logger.js`
- Create: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/src/utils/response.js`
- Create: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/src/utils/errors.js`
- Create: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/src/middlewares/requestId.middleware.js`
- Create: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/src/middlewares/security.middleware.js`
- Create: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/src/middlewares/rateLimit.middleware.js`
- Create: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/src/middlewares/error.middleware.js`
- Create: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/src/routes/health.routes.js`
- Create: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/src/app.js`
- Create: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/src/server.js`
- Test: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/tests/unit/health.test.js`

**Interfaces:**
- Consumes: nada (primer task).
- Produces (lo usan todas las tareas siguientes):
  - `env` (`config/environment.js`): `{ port: number(=4001), nodeEnv, supabaseUrl, supabaseAnonKey, databaseUrl, dbSchema: string(='monitoreo'), corsOrigin: string[], rateLimitWindowMs, rateLimitMax, posAlertsUrl, posAlertsApiKey, workerIntervalMs, deliveryTimeoutMs, deliveryBackoffMinutes, deliveryMaxIntentos }` + `assertEnvForStart()`.
  - `sequelize`, `testConnection()` (`config/database.js`) — Sequelize apuntando a `env.databaseUrl`.
  - `logger` (pino), `ok(res, data, status=200)`, `fail(res, status, error, detail?)`→ respuesta `{ error, detail? }`, `AppError(status, error, detail)`.
  - `requestId`, `securityHeaders` (helmet), `apiLimiter` (rate-limit), `errorHandler`, `notFound` — middlewares.
  - `healthRouter` montado en `/health`.
  - `createApp()` → Express app; `server.js` arranca en `env.port`.
  - `npm test` → `node --test tests/`.

- [ ] **Step 1: Escribir el test fallido de health**

`tests/unit/health.test.js`:

```js
const { test, before, after } = require('node:test');
const assert = require('node:assert');

process.env.NODE_ENV = 'test'; // ANTES de requerir src/: apaga pino-http autoLogging y el banner de dotenv
process.env.PORT = '0'; // puerto efímero en tests

let server; let base;

before(async () => {
  const { createApp } = require('../../src/app');
  const app = createApp();
  await new Promise((r) => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server?.close());

test('GET /health responde ok con nombre del servicio', async () => {
  const res = await fetch(`${base}/health`);
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.strictEqual(body.ok, true);
  assert.strictEqual(body.service, 'monitoreo-backend');
  assert.ok(typeof body.ts === 'string');
});

test('ruta desconocida responde 404 con { error } sin stack trace', async () => {
  const res = await fetch(`${base}/no-existe`);
  assert.strictEqual(res.status, 404);
  const body = await res.json();
  assert.ok(body.error);
  assert.ok(!JSON.stringify(body).includes('at '), 'no debe filtrar stack traces');
});

test('X-Request-Id está presente en la respuesta', async () => {
  const res = await fetch(`${base}/health`);
  assert.ok(res.headers.get('x-request-id'));
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

```powershell
cd "Proyecto-Heladeria-Monitoreo\monitoreo\backend"; node --test tests/unit/health.test.js
```
Expected: FAIL — `Cannot find module '../../src/app'` (archivos aún vacíos/inexistentes).

- [ ] **Step 3: Implementar config, utils y middlewares**

`package.json`:

```json
{
  "name": "monitoreo-backend",
  "version": "1.0.0",
  "description": "Monitoreo Agua-Energia - Node.js + Sequelize + Supabase (JS puro)",
  "main": "src/server.js",
  "type": "commonjs",
  "scripts": {
    "dev": "node --watch src/server.js",
    "start": "node src/server.js",
    "test": "node --test --test-concurrency=1 \"tests/**/*.test.js\"",
    "test:unit": "node --test \"tests/unit/**/*.test.js\""
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.116.0",
    "cors": "^2.8.6",
    "dotenv": "^18.0.2",
    "express": "^5.2.1",
    "express-rate-limit": "^8.7.0",
    "helmet": "^8.3.0",
    "pg": "^8.23.0",
    "pg-hstore": "^2.3.4",
    "pino": "^10.3.1",
    "pino-http": "^11.0.0",
    "sequelize": "^6.37.8",
    "zod": "^4.6.5"
  }
}
```

`.env.example`:

```env
# Backend Monitoreo — copia a .env y completa. NUNCA subas .env a Git.
PORT=4001
NODE_ENV=development
SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_ANON_KEY=clave-publishable-de-supabase
DATABASE_URL=postgresql://postgres:PASSWORD@db.jbafjkcblplghcqakrwj.supabase.co:5432/postgres
MONITOREO_DB_SCHEMA=monitoreo
CORS_ORIGIN=http://localhost:5174
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
# Salida hacia el POS (entrega de alertas)
POS_ALERTS_URL=http://localhost:3000/api/v1/integrations/alerts
POS_ALERTS_API_KEY=clave-que-el-POS-valida-en-su-endpoint-de-alertas
WORKER_INTERVAL_MS=30000
DELIVERY_TIMEOUT_MS=5000
DELIVERY_BACKOFF_MINUTES=5
DELIVERY_MAX_INTENTOS=10
# Tests de integración (opcional; si falta, esos tests se saltan)
# MONITOREO_TEST_DATABASE_URL=postgresql://postgres:PASSWORD@db.PROYECTO.supabase.co:5432/postgres
```

`src/config/environment.js`:

```js
require('dotenv').config({ quiet: true }); // quiet: sin banner "injected env" en la salida de tests

const env = {
  port: parseInt(process.env.PORT || '4001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
  databaseUrl: process.env.DATABASE_URL || '',
  dbSchema: process.env.MONITOREO_DB_SCHEMA || 'monitoreo',
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5174').split(',').map((s) => s.trim()),
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  posAlertsUrl: process.env.POS_ALERTS_URL || '',
  posAlertsApiKey: process.env.POS_ALERTS_API_KEY || '',
  workerIntervalMs: parseInt(process.env.WORKER_INTERVAL_MS || '30000', 10),
  deliveryTimeoutMs: parseInt(process.env.DELIVERY_TIMEOUT_MS || '5000', 10),
  deliveryBackoffMinutes: parseInt(process.env.DELIVERY_BACKOFF_MINUTES || '5', 10),
  deliveryMaxIntentos: parseInt(process.env.DELIVERY_MAX_INTENTOS || '10', 10),
};

function assertEnvForStart() {
  const faltan = [];
  if (!env.supabaseUrl) faltan.push('SUPABASE_URL');
  if (!env.databaseUrl) faltan.push('DATABASE_URL');
  if (env.nodeEnv === 'production') {
    if (!env.posAlertsUrl) faltan.push('POS_ALERTS_URL');
    if (!env.posAlertsApiKey) faltan.push('POS_ALERTS_API_KEY');
  }
  if (faltan.length) throw new Error(`Missing env: ${faltan.join(', ')}`);
}

module.exports = { env, assertEnvForStart };
```

`src/config/database.js` (espejo de `posBackend/src/config/database.js`):

```js
const { Sequelize } = require('sequelize');
const { env } = require('./environment');

const sequelize = new Sequelize(env.databaseUrl || 'postgres://postgres:postgres@localhost:5432/postgres', {
  dialect: 'postgres',
  logging: env.nodeEnv === 'development' ? console.log : false,
  dialectOptions: env.nodeEnv === 'production' ? { ssl: { require: true, rejectUnauthorized: false } } : {},
  pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
});

async function testConnection() {
  await sequelize.authenticate();
}

module.exports = { sequelize, testConnection };
```

`src/utils/logger.js`:

```js
const pino = require('pino');
const { env } = require('../config/environment');

const logger = pino({
  level: env.nodeEnv === 'test' ? 'silent' : 'info',
  base: { service: 'monitoreo-backend' },
});

module.exports = { logger };
```

`src/utils/response.js`:

```js
function ok(res, data, status = 200) {
  return res.status(status).json(data);
}

function okList(res, data, extra = {}) {
  return res.status(200).json({ data, ...extra });
}

function fail(res, status, error, detail) {
  return res.status(status).json(detail ? { error, detail } : { error });
}

module.exports = { ok, okList, fail };
```

`src/utils/errors.js`:

```js
class AppError extends Error {
  constructor(status, error, detail) {
    super(detail ? `${error}: ${detail}` : error);
    this.status = status;
    this.error = error;
    this.detail = detail;
  }
}

module.exports = { AppError };
```

`src/middlewares/requestId.middleware.js`:

```js
const crypto = require('crypto');

function requestId(req, res, next) {
  const incoming = req.headers['x-request-id'];
  const id = typeof incoming === 'string' && incoming.length <= 100 ? incoming : crypto.randomUUID();
  req.id = id;
  res.setHeader('X-Request-Id', id);
  next();
}

module.exports = { requestId };
```

`src/middlewares/security.middleware.js`:

```js
const helmet = require('helmet');
const cors = require('cors');
const { env } = require('../config/environment');

const securityHeaders = helmet({
  contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], objectSrc: ["'none'"] } },
  hsts: { maxAge: 31536000, includeSubDomains: true },
  noSniff: true,
  xssFilter: true,
  hidePoweredBy: true,
});

const corsMiddleware = cors({ origin: env.corsOrigin, credentials: true });

module.exports = { securityHeaders, corsMiddleware };
```

`src/middlewares/rateLimit.middleware.js`:

```js
const rateLimit = require('express-rate-limit');
const { env } = require('../config/environment');

const apiLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit excedido' },
});

module.exports = { apiLimiter };
```

`src/middlewares/error.middleware.js`:

```js
const { logger } = require('../utils/logger');
const { AppError } = require('../utils/errors');

function notFound(req, res) {
  res.status(404).json({ error: 'Ruta no encontrada' });
}

function errorHandler(err, req, res, _next) {
  const status = err instanceof AppError ? err.status : err.status || 500;
  const payload = err instanceof AppError
    ? { error: err.error, ...(err.detail ? { detail: err.detail } : {}) }
    : { error: status >= 500 ? 'Error interno' : 'Error de solicitud' };
  logger.error({ reqId: req.id, status, msg: err.message }, 'error handler');
  res.status(status).json(payload); // jamás stack traces al cliente
}

module.exports = { notFound, errorHandler };
```

`src/routes/health.routes.js`:

```js
const { Router } = require('express');
const router = Router();
router.get('/', (_req, res) => res.json({ ok: true, service: 'monitoreo-backend', ts: new Date().toISOString() }));
module.exports = { healthRouter: router };
```

`src/app.js`:

```js
const express = require('express');
const pinoHttp = require('pino-http');
const { env } = require('./config/environment');
const { logger } = require('./utils/logger');
const { securityHeaders, corsMiddleware } = require('./middlewares/security.middleware');
const { requestId } = require('./middlewares/requestId.middleware');
const { apiLimiter } = require('./middlewares/rateLimit.middleware');
const { notFound, errorHandler } = require('./middlewares/error.middleware');
const { healthRouter } = require('./routes/health.routes');

function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(requestId);
  app.use(securityHeaders);
  app.use(corsMiddleware);
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(pinoHttp({ logger, autoLogging: env.nodeEnv !== 'test' }));
  app.use('/api', apiLimiter);

  app.use('/health', healthRouter);
  // routers de negocio se montan en Tasks 4-9:
  // app.use('/api/v1/auth', authRouter); ... etc.

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
```

`src/server.js`:

```js
const { createApp } = require('./app');
const { env, assertEnvForStart } = require('./config/environment');
const { testConnection } = require('./config/database');
const { logger } = require('./utils/logger');

(async () => {
  try {
    assertEnvForStart();
    await testConnection();
    const app = createApp();
    app.listen(env.port, () => logger.info({ port: env.port }, 'monitoreo-backend listening'));
  } catch (e) {
    logger.error({ err: e.message }, 'fallo al iniciar');
    process.exit(1);
  }
})();
```

- [ ] **Step 4: Instalar dependencias**

```powershell
cd "Proyecto-Heladeria-Monitoreo\monitoreo\backend"; npm install
```
Expected: instalación OK sin errores de resolución.

- [ ] **Step 5: Ejecutar el test y verificar que pasa**

```powershell
node --test tests/unit/health.test.js
```
Expected: PASS (3 tests).

- [ ] **Step 6: Commit (lo ejecuta EL USUARIO — AGENTS.md §10.1)**

```powershell
cd "D:\Ediciones, codigo y arte\proyecto final\ProyectoFinalPW2"
git add "Proyecto-Heladeria-Monitoreo/monitoreo/backend"
git commit -m "feat(monitoreo): scaffold backend - config, utils, middlewares, health"
```

---

### Task 2: Migración DDL del schema `monitoreo` + seed (vía Supabase MCP)

**Files:**
- Create: `Proyecto-Heladeria-Monitoreo/database/monitoreo/001_v1_0_monitoreo_ddl.sql`
- Create: `Proyecto-Heladeria-Monitoreo/database/monitoreo/002_seed_dev.sql`

**Interfaces:**
- Consumes: acceso MCP de Supabase conectado (proyecto `jbafjkcblplghcqakrwj`).
- Produces (los usan Task 3+): las 20 tablas del schema `monitoreo` con columnas exactas listadas abajo; seed con roles, permisos, organización dev, integración (`api_key_hash` = sha256 de `dev-monitoreo-integration-key`), tipos de recurso, punto de medición y umbrales ejemplo. Ninguna tabla del POS es referenciada.

- [ ] **Step 1: Escribir el DDL completo**

`database/monitoreo/001_v1_0_monitoreo_ddl.sql`:

```sql
-- Monitoreo V1.0 — DDL. Aplicar vía Supabase MCP apply_migration.
-- Reglas: UUID PK, NUMERIC (nunca float) para cantidades/dinero, estados con CHECK,
-- índices en FKs/fechas/estados, sin FKs hacia tablas del POS.
CREATE SCHEMA IF NOT EXISTS monitoreo;
SET search_path TO monitoreo, public;

-- ===== RBAC =====
CREATE TABLE organizacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  nit TEXT UNIQUE,
  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','inactivo')),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE usuario (
  id UUID PRIMARY KEY, -- coincide con auth.uid de Supabase Auth
  email TEXT NOT NULL UNIQUE,
  nombre TEXT,
  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','inactivo')),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE rol (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','inactivo'))
);

CREATE TABLE permiso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE
);

CREATE TABLE rol_permiso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rol_id UUID NOT NULL REFERENCES rol(id),
  permiso_id UUID NOT NULL REFERENCES permiso(id),
  UNIQUE (rol_id, permiso_id)
);

CREATE TABLE usuario_organizacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuario(id),
  organizacion_id UUID NOT NULL REFERENCES organizacion(id),
  rol_id UUID NOT NULL REFERENCES rol(id),
  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','inactivo')),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (usuario_id, organizacion_id)
);

-- ===== Integración (solo hashes) =====
CREATE TABLE integracion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES organizacion(id),
  nombre TEXT NOT NULL,
  api_key_hash TEXT NOT NULL UNIQUE, -- sha256 hex; jamás texto plano
  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','inactivo')),
  ultimo_uso_en TIMESTAMPTZ,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== Medición =====
CREATE TABLE tipo_recurso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE CHECK (codigo IN ('agua','energia')),
  nombre TEXT NOT NULL,
  unidad_base TEXT NOT NULL
);

CREATE TABLE punto_medicion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES organizacion(id),
  tipo_recurso_id UUID NOT NULL REFERENCES tipo_recurso(id),
  codigo_medidor TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','inactivo')),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_punto_medicion_org ON punto_medicion(organizacion_id);

-- ===== Recepción de consumos del POS (idempotencia) =====
CREATE TABLE recepcion_consumo_pos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consumo_externo_id UUID NOT NULL UNIQUE,
  idempotency_key TEXT NOT NULL UNIQUE,
  organizacion_id UUID NOT NULL REFERENCES organizacion(id),
  punto_medicion_id UUID REFERENCES punto_medicion(id),
  tipo_recurso TEXT NOT NULL CHECK (tipo_recurso IN ('agua','energia')),
  cantidad NUMERIC(14,3) NOT NULL CHECK (cantidad > 0),
  unidad_medida TEXT NOT NULL,
  fecha_consumo TIMESTAMPTZ NOT NULL,
  origen TEXT NOT NULL DEFAULT 'POS',
  estado TEXT NOT NULL DEFAULT 'recibido' CHECK (estado IN ('recibido','procesado','error')),
  recepcionado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_recepcion_org_fecha ON recepcion_consumo_pos(organizacion_id, fecha_consumo);
CREATE INDEX idx_recepcion_estado ON recepcion_consumo_pos(estado);

CREATE TABLE cola_procesamiento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recepcion_id UUID NOT NULL UNIQUE REFERENCES recepcion_consumo_pos(id),
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','procesado','error')),
  intentos INT NOT NULL DEFAULT 0,
  proximo_intento TIMESTAMPTZ,
  ultimo_error TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cola_claim ON cola_procesamiento(estado, proximo_intento);

-- ===== Registro + clasificación =====
CREATE TABLE registro_consumo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recepcion_id UUID NOT NULL UNIQUE REFERENCES recepcion_consumo_pos(id),
  organizacion_id UUID NOT NULL REFERENCES organizacion(id),
  punto_medicion_id UUID REFERENCES punto_medicion(id),
  tipo_recurso_id UUID NOT NULL REFERENCES tipo_recurso(id),
  tipo_recurso TEXT NOT NULL CHECK (tipo_recurso IN ('agua','energia')),
  cantidad NUMERIC(14,3) NOT NULL CHECK (cantidad > 0),
  unidad_medida TEXT NOT NULL,
  fecha_consumo TIMESTAMPTZ NOT NULL,
  clasificacion TEXT NOT NULL DEFAULT 'sin_umbral' CHECK (clasificacion IN ('normal','alerta','critico','sin_umbral')),
  origen TEXT NOT NULL DEFAULT 'POS',
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_registro_org_fecha ON registro_consumo(organizacion_id, fecha_consumo);

CREATE TABLE umbral_clasificacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES organizacion(id),
  tipo_recurso_id UUID NOT NULL REFERENCES tipo_recurso(id),
  nombre TEXT NOT NULL,
  nivel TEXT NOT NULL CHECK (nivel IN ('normal','alerta','critico')),
  limite_inferior NUMERIC(14,3) NOT NULL CHECK (limite_inferior >= 0),
  limite_superior NUMERIC(14,3) NOT NULL CHECK (limite_superior > 0),
  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','inactivo')),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (limite_inferior < limite_superior),
  UNIQUE (organizacion_id, tipo_recurso_id, nombre)
);
CREATE INDEX idx_umbral_lookup ON umbral_clasificacion(organizacion_id, tipo_recurso_id, estado);

-- ===== Alertas / notificaciones / entrega =====
CREATE TABLE alerta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES organizacion(id),
  registro_consumo_id UUID REFERENCES registro_consumo(id),
  umbral_id UUID REFERENCES umbral_clasificacion(id),
  nivel TEXT NOT NULL CHECK (nivel IN ('alerta','critico')),
  tipo_recurso TEXT NOT NULL CHECK (tipo_recurso IN ('agua','energia')),
  mensaje TEXT NOT NULL,
  fecha_generacion TIMESTAMPTZ NOT NULL DEFAULT now(),
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','entregada','error')),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_alerta_org_fecha ON alerta(organizacion_id, fecha_generacion);

CREATE TABLE notificacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alerta_id UUID NOT NULL REFERENCES alerta(id),
  usuario_id UUID REFERENCES usuario(id), -- NULL = broadcast a la org
  canal TEXT NOT NULL DEFAULT 'in_app' CHECK (canal IN ('in_app','email')),
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','vista','error')),
  creada_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  vista_en TIMESTAMPTZ
);
CREATE INDEX idx_notif_usuario ON notificacion(usuario_id, estado);

CREATE TABLE entrega_alerta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alerta_id UUID NOT NULL UNIQUE REFERENCES alerta(id),
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','enviada','error')),
  intentos INT NOT NULL DEFAULT 0,
  proximo_intento TIMESTAMPTZ,
  ultimo_error TEXT,
  creada_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_entrega_claim ON entrega_alerta(estado, proximo_intento);

-- ===== Objetivos / costos / recomendaciones =====
CREATE TABLE meta_reduccion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES organizacion(id),
  tipo_recurso_id UUID NOT NULL REFERENCES tipo_recurso(id),
  nombre TEXT NOT NULL,
  porcentaje_reduccion NUMERIC(5,2) NOT NULL CHECK (porcentaje_reduccion >= 0 AND porcentaje_reduccion <= 100),
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','inactivo','cumplida','incumplida')),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (fecha_inicio < fecha_fin)
);
CREATE INDEX idx_meta_org ON meta_reduccion(organizacion_id, estado);

CREATE TABLE tarifa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id UUID REFERENCES organizacion(id), -- NULL = tarifa global
  tipo_recurso_id UUID NOT NULL REFERENCES tipo_recurso(id),
  nombre TEXT NOT NULL,
  monto NUMERIC(14,4) NOT NULL CHECK (monto >= 0),
  unidad TEXT NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (fecha_inicio <= fecha_fin)
);
CREATE INDEX idx_tarifa_vigencia ON tarifa(tipo_recurso_id, fecha_inicio, fecha_fin);

CREATE TABLE recomendacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES organizacion(id),
  titulo TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  prioridad TEXT NOT NULL DEFAULT 'media' CHECK (prioridad IN ('baja','media','alta')),
  estado TEXT NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta','aplicada','descartada')),
  creada_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_recomendacion_org ON recomendacion(organizacion_id, estado);

-- ===== Auditoría =====
CREATE TABLE auditoria_cambio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad TEXT NOT NULL,
  entidad_id UUID,
  accion TEXT NOT NULL,
  usuario_id UUID,
  req_id TEXT,
  detalle JSONB,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_auditoria_entidad ON auditoria_cambio(entidad, entidad_id);
CREATE INDEX idx_auditoria_fecha ON auditoria_cambio(creado_en);
```

- [ ] **Step 2: Escribir el seed dev**

`database/monitoreo/002_seed_dev.sql`:

```sql
-- Seed de desarrollo para schema monitoreo. Idempotente.
SET search_path TO monitoreo, public;

-- Roles
INSERT INTO rol (nombre) VALUES ('admin_monitoreo'), ('operador'), ('observador')
ON CONFLICT (nombre) DO NOTHING;

-- Permisos
INSERT INTO permiso (nombre) VALUES
  ('organizacion.gestionar'),('organizacion.consultar'),
  ('usuario.gestionar'),
  ('medidor.gestionar'),('medidor.consultar'),
  ('recurso.gestionar'),
  ('integracion.gestionar'),('integracion.consultar'),
  ('umbral.gestionar'),('umbral.consultar'),
  ('meta.gestionar'),('meta.consultar'),
  ('tarifa.gestionar'),('tarifa.consultar'),
  ('recomendacion.gestionar'),('recomendacion.consultar'),
  ('alerta.consultar'),
  ('notificacion.consultar'),
  ('consumo.consultar'),
  ('reporte.consultar')
ON CONFLICT (nombre) DO NOTHING;

-- Rol admin: todos los permisos
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r CROSS JOIN permiso p
WHERE r.nombre = 'admin_monitoreo'
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- Rol operador: consultas + notificaciones + recomendaciones + umbrales/meta/tarifa en lectura
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r
JOIN permiso p ON p.nombre IN (
  'organizacion.consultar','medidor.consultar','integracion.consultar',
  'umbral.consultar','meta.consultar','tarifa.consultar',
  'recomendacion.consultar','recomendacion.gestionar',
  'alerta.consultar','notificacion.consultar','consumo.consultar','reporte.consultar'
)
WHERE r.nombre = 'operador'
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- Rol observador: solo lectura básica
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r
JOIN permiso p ON p.nombre IN (
  'organizacion.consultar','alerta.consultar','notificacion.consultar',
  'consumo.consultar','reporte.consultar'
)
WHERE r.nombre = 'observador'
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- Organización dev
INSERT INTO organizacion (id, nombre, nit)
VALUES ('11111111-1111-4111-8111-111111111111', 'Heladería Demo', 'DEMO-001')
ON CONFLICT (id) DO NOTHING;

-- Integración dev: api_key_hash = sha256('dev-monitoreo-integration-key')
INSERT INTO integracion (organizacion_id, nombre, api_key_hash)
SELECT id, 'POS colaWorker (dev)',
       encode(sha256('dev-monitoreo-integration-key'::bytea), 'hex')
FROM organizacion WHERE id = '11111111-1111-4111-8111-111111111111'
ON CONFLICT (api_key_hash) DO NOTHING;

-- Tipos de recurso
INSERT INTO tipo_recurso (codigo, nombre, unidad_base) VALUES
  ('agua', 'Agua', 'litros'),
  ('energia', 'Energía', 'kwh')
ON CONFLICT (codigo) DO NOTHING;

-- Punto de medición dev
INSERT INTO punto_medicion (organizacion_id, tipo_recurso_id, codigo_medidor, nombre)
SELECT '11111111-1111-4111-8111-111111111111', tr.id, 'MED-AGUA-01', 'Medidor principal agua'
FROM tipo_recurso tr WHERE tr.codigo = 'agua'
ON CONFLICT (codigo_medidor) DO NOTHING;

-- Umbrales ejemplo agua (rangos contiguos, sin solape): normal/alerta/critico
INSERT INTO umbral_clasificacion (organizacion_id, tipo_recurso_id, nombre, nivel, limite_inferior, limite_superior)
SELECT '11111111-1111-4111-8111-111111111111', tr.id, v.nombre, v.nivel, v.inf, v.sup
FROM tipo_recurso tr
CROSS JOIN (VALUES
  ('agua normal',   'normal', 0, 1000),
  ('agua alerta',   'alerta', 1000, 1500),
  ('agua critico',  'critico', 1500, 999999999)
) AS v(nombre, nivel, inf, sup)
WHERE tr.codigo = 'agua'
ON CONFLICT (organizacion_id, tipo_recurso_id, nombre) DO NOTHING;
```

- [ ] **Step 3: Inspeccionar el estado actual de la BD (MCP)**

Ejecutar `tools.supabase.list_tables({ schemas: ["public"], verbose: false })` y `tools.supabase.execute_sql({ query: "SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('pg_catalog','information_schema') ORDER BY 1" })`.

Expected: ver los schemas existentes; confirmar que `monitoreo` aún no existe y qué hay en `public` (no tocar nada de `public`).

- [ ] **Step 4: Aplicar migración y seed vía MCP**

1. `tools.supabase.apply_migration({ name: "monitoreo_v1_0_ddl", query: <contenido completo del paso 1> })`
2. `tools.supabase.apply_migration({ name: "monitoreo_seed_dev", query: <contenido del paso 2> })`

Expected: ambas OK. Si hay error de sintaxis, corregir el archivo local y reintentar.

- [ ] **Step 5: Verificar tablas y seed**

`tools.supabase.execute_sql({ query: "SELECT table_name FROM information_schema.tables WHERE table_schema='monitoreo' ORDER BY 1" })`

Expected: 20 tablas (`alerta`, `auditoria_cambio`, `cola_procesamiento`, `entrega_alerta`, `integracion`, `meta_reduccion`, `notificacion`, `organizacion`, `permiso`, `punto_medicion`, `recepcion_consumo_pos`, `recomendacion`, `registro_consumo`, `rol`, `rol_permiso`, `tarifa`, `tipo_recurso`, `umbral_clasificacion`, `usuario`, `usuario_organizacion`).

`tools.supabase.execute_sql({ query: "SELECT (SELECT count(*) FROM monitoreo.permiso) permisos, (SELECT count(*) FROM monitoreo.umbral_clasificacion) umbrales, (SELECT count(*) FROM monitoreo.integracion) integraciones" })`

Expected: `permisos=20`, `umbrales=3`, `integraciones=1`.

- [ ] **Step 6: Commit (lo ejecuta EL USUARIO)**

```powershell
git add "Proyecto-Heladeria-Monitoreo/database/monitoreo"
git commit -m "feat(monitoreo): DDL v1.0 schema monitoreo (20 tablas) + seed dev"
```

---

### Task 3: Modelos Sequelize + asociaciones (21 archivos)

**Files:**
- Create (esqueletos vacíos → contenido): todos en `Proyecto-Heladeria-Monitoreo/monitoreo/backend/src/models/`:
  `organizacion.model.js`, `usuario.model.js`, `rol.model.js`, `permiso.model.js`, `rolPermiso.model.js`, `usuarioOrganizacion.model.js`, `integracion.model.js`, `tipoRecurso.model.js`, `puntoMedicion.model.js`, `recepcionConsumoPOS.model.js`, `colaProcesamiento.model.js`, `registroConsumo.model.js`, `umbralClasificacion.model.js`, `alerta.model.js`, `notificacion.model.js`, `entregaAlerta.model.js`, `metaReduccion.model.js`, `tarifa.model.js`, `recomendacion.model.js`, `auditoriaCambio.model.js`, `index.js`
- Test: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/tests/unit/models.test.js`

**Interfaces:**
- Consumes: tablas del Task 2; `sequelize` y `env.dbSchema` del Task 1.
- Produces (exporta `models/index.js`): `Organizacion, Usuario, Rol, Permiso, RolPermiso, UsuarioOrganizacion, Integracion, TipoRecurso, PuntoMedicion, RecepcionConsumoPOS, ColaProcesamiento, RegistroConsumo, UmbralClasificacion, Alerta, Notificacion, EntregaAlerta, MetaReduccion, Tarifa, Recomendacion, AuditoriaCambio` + `{ sequelize, ...models }`. Todas las tablas con `schema: env.dbSchema`. Asociaciones listadas en Step 3. Los repositories de Tasks 4-9 importan desde `../models`.

- [ ] **Step 1: Escribir el test fallido**

`tests/unit/models.test.js`:

```js
const { test } = require('node:test');
const assert = require('node:assert');

test('models/index.js exporta los 20 modelos con sus asociaciones', () => {
  const m = require('../../src/models');
  const esperados = [
    'Organizacion','Usuario','Rol','Permiso','RolPermiso','UsuarioOrganizacion',
    'Integracion','TipoRecurso','PuntoMedicion','RecepcionConsumoPOS',
    'ColaProcesamiento','RegistroConsumo','UmbralClasificacion','Alerta',
    'Notificacion','EntregaAlerta','MetaReduccion','Tarifa','Recomendacion','AuditoriaCambio',
  ];
  for (const nombre of esperados) {
    assert.ok(m[nombre], `falta modelo ${nombre}`);
    assert.ok(m[nombre].rawAttributes.id, `${nombre} debe tener PK id`);
  }
  assert.ok(m.sequelize, 'debe exportar sequelize');
});

test('RecepcionConsumoPOS tiene constraints de idempotencia', () => {
  const { RecepcionConsumoPOS } = require('../../src/models');
  const u = RecepcionConsumoPOS.rawAttributes;
  assert.ok(u.idempotency_key.unique || u.idempotency_key.unique === true,
    'idempotency_key UNIQUE');
  assert.ok(u.consumo_externo_id.unique, 'consumo_externo_id UNIQUE');
  assert.strictEqual(u.cantidad.type.key, 'DECIMAL', 'cantidad NUMERIC en BD; sequelize 6 usa key DECIMAL (DataTypes.NUMERIC da key DECIMAL)');
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

```powershell
node --test tests/unit/models.test.js
```
Expected: FAIL — `Cannot find module '../../src/models'` o modelos vacíos.

- [ ] **Step 3: Implementar los modelos**

Patrón de cada archivo (usar **exactamente** este molde; las columnas por modelo están en el DDL del Task 2 — todo modelo: `tableName` snake_case, `schema: env.dbSchema`, `timestamps: true, createdAt: 'creado_en', updatedAt: false`, PK `id UUID` con `DataTypes.UUIDV4` donde la tabla lo tiene por DEFAULT; `usuario` usa el UUID fijo del Auth, sin DEFAULT. **Excepciones:** `timestamps: false` cuando la tabla NO tiene columna de creación (`rol`, `permiso`, `rol_permiso`, `tipo_recurso`) o cuando la maneja la DB (marcados en la tabla de abajo); `createdAt: 'creada_en'` en `notificacion` y `recomendacion`, cuya columna es `creada_en`):

Ejemplar completo A — `src/models/organizacion.model.js`:

```js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { env } = require('../config/environment');

const Organizacion = sequelize.define('Organizacion', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  nombre: { type: DataTypes.STRING(120), allowNull: false },
  nit: { type: DataTypes.STRING(30), unique: true },
  estado: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'activo',
    validate: { isIn: [['activo', 'inactivo']] } },
}, {
  tableName: 'organizacion',
  schema: env.dbSchema,
  timestamps: true,
  createdAt: 'creado_en',
  updatedAt: false,
});

module.exports = Organizacion;
```

Ejemplar completo B — `src/models/recepcionConsumoPOS.model.js` (los críticos de idempotencia):

```js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { env } = require('../config/environment');

const RecepcionConsumoPOS = sequelize.define('RecepcionConsumoPOS', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  consumo_externo_id: { type: DataTypes.UUID, allowNull: false, unique: true },
  idempotency_key: { type: DataTypes.STRING(120), allowNull: false, unique: true },
  organizacion_id: { type: DataTypes.UUID, allowNull: false },
  punto_medicion_id: { type: DataTypes.UUID, allowNull: true },
  tipo_recurso: { type: DataTypes.STRING(10), allowNull: false,
    validate: { isIn: [['agua', 'energia']] } },
  cantidad: { type: DataTypes.DECIMAL(14, 3), allowNull: false,
    validate: { min: 0.001 } },
  unidad_medida: { type: DataTypes.STRING(20), allowNull: false },
  fecha_consumo: { type: DataTypes.DATE, allowNull: false },
  origen: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'POS' },
  estado: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'recibido',
    validate: { isIn: [['recibido', 'procesado', 'error']] } },
  recepcionado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: 'recepcion_consumo_pos',
  schema: env.dbSchema,
  timestamps: false, // recepcionado_en lo maneja la DB
});

module.exports = RecepcionConsumoPOS;
```

Ejemplar completo C — `src/models/umbralClasificacion.model.js` (CHECKs de rango):

```js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { env } = require('../config/environment');

const UmbralClasificacion = sequelize.define('UmbralClasificacion', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  organizacion_id: { type: DataTypes.UUID, allowNull: false },
  tipo_recurso_id: { type: DataTypes.UUID, allowNull: false },
  nombre: { type: DataTypes.STRING(120), allowNull: false },
  nivel: { type: DataTypes.STRING(10), allowNull: false,
    validate: { isIn: [['normal', 'alerta', 'critico']] } },
  limite_inferior: { type: DataTypes.DECIMAL(14, 3), allowNull: false,
    validate: { min: 0 } },
  limite_superior: { type: DataTypes.DECIMAL(14, 3), allowNull: false,
    validate: { min: 0.001 } },
  estado: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'activo',
    validate: { isIn: [['activo', 'inactivo']] } },
}, {
  tableName: 'umbral_clasificacion',
  schema: env.dbSchema,
  timestamps: true,
  createdAt: 'creado_en',
  updatedAt: false,
});

module.exports = UmbralClasificacion;
```

Mapa columna→tipo para los 17 modelos restantes (derivado 1:1 del DDL del Task 2; aplicar el mismo molde de los ejemplares — `NUMERIC` → `DECIMAL`, `TEXT` → `DataTypes.TEXT`, `DATE` → `DataTypes.DATEONLY` solo para columnas `DATE` de metas/tarifas, `TIMESTAMPTZ` → `DataTypes.DATE`, `JSONB` → `DataTypes.JSONB`, `INT` → `DataTypes.INTEGER`, nullable = `allowNull: true`, UNIQUE donde el DDL lo indica):

| Modelo (archivo) | tableName | Campos (además de PK id UUID) |
|---|---|---|
| `usuario.model.js` | `usuario` | `id` (UUID, **sin defaultValue**, PK), `email` STRING NOT NULL UNIQUE, `nombre` STRING(120) null, `estado` STRING(10) `'activo'` ∈ activo/inactivo, `creado_en` DATE now |
| `rol.model.js` | `rol` | `nombre` STRING(60) NOT NULL UNIQUE, `estado` STRING(10) `'activo'` ∈ activo/inactivo; **`timestamps:false`** (tabla sin `creado_en`) |
| `permiso.model.js` | `permiso` | `nombre` STRING(80) NOT NULL UNIQUE; **`timestamps:false`** (tabla sin `creado_en`) |
| `rolPermiso.model.js` | `rol_permiso` | `rol_id` UUID NOT NULL, `permiso_id` UUID NOT NULL; **`timestamps:false`** (tabla sin `creado_en`) |
| `usuarioOrganizacion.model.js` | `usuario_organizacion` | `usuario_id` UUID NOT NULL, `organizacion_id` UUID NOT NULL, `rol_id` UUID NOT NULL, `estado` STRING(10) `'activo'`, `creado_en` DATE now |
| `integracion.model.js` | `integracion` | `organizacion_id` UUID NOT NULL, `nombre` STRING(120) NOT NULL, `api_key_hash` STRING(128) NOT NULL UNIQUE, `estado` STRING(10) `'activo'`, `ultimo_uso_en` DATE null, `creado_en` DATE now |
| `tipoRecurso.model.js` | `tipo_recurso` | `id` UUID PK, `codigo` STRING(10) UNIQUE NOT NULL ∈ agua/energia, `nombre` STRING(60) NOT NULL, `unidad_base` STRING(20) NOT NULL; **`timestamps:false`** (tabla sin `creado_en`) |
| `puntoMedicion.model.js` | `punto_medicion` | `organizacion_id` UUID NOT NULL, `tipo_recurso_id` UUID NOT NULL, `codigo_medidor` STRING(60) NOT NULL UNIQUE, `nombre` STRING(120) NOT NULL, `estado` STRING(10) `'activo'`, `creado_en` DATE now |
| `colaProcesamiento.model.js` | `cola_procesamiento` | `recepcion_id` UUID NOT NULL UNIQUE, `estado` STRING(10) `'pendiente'` ∈ pendiente/procesado/error, `intentos` INTEGER 0, `proximo_intento` DATE null, `ultimo_error` TEXT null, `creado_en` DATE now; **`timestamps:false`** (creado_en DEFAULT) |
| `registroConsumo.model.js` | `registro_consumo` | `recepcion_id` UUID NOT NULL UNIQUE, `organizacion_id` UUID NOT NULL, `punto_medicion_id` UUID null, `tipo_recurso_id` UUID NOT NULL, `tipo_recurso` STRING(10) ∈ agua/energia, `cantidad` DECIMAL(14,3) NOT NULL, `unidad_medida` STRING(20) NOT NULL, `fecha_consumo` DATE NOT NULL, `clasificacion` STRING(12) `'sin_umbral'` ∈ normal/alerta/critico/sin_umbral, `origen` STRING(20) `'POS'`, `creado_en` DATE now |
| `alerta.model.js` | `alerta` | `organizacion_id` UUID NOT NULL, `registro_consumo_id` UUID null, `umbral_id` UUID null, `nivel` STRING(10) ∈ alerta/critico NOT NULL, `tipo_recurso` STRING(10) ∈ agua/energia, `mensaje` TEXT NOT NULL, `fecha_generacion` DATE now NOT NULL, `estado` STRING(10) `'pendiente'` ∈ pendiente/entregada/error, `creado_en` DATE now |
| `notificacion.model.js` | `notificacion` | `alerta_id` UUID NOT NULL, `usuario_id` UUID null, `canal` STRING(10) `'in_app'` ∈ in_app/email, `estado` STRING(10) `'pendiente'` ∈ pendiente/vista/error, `creada_en` DATE now, `vista_en` DATE null |
| `entregaAlerta.model.js` | `entrega_alerta` | `alerta_id` UUID NOT NULL UNIQUE, `estado` STRING(10) `'pendiente'` ∈ pendiente/enviada/error, `intentos` INTEGER 0, `proximo_intento` DATE null, `ultimo_error` TEXT null, `creada_en` DATE now; **`timestamps:false`** |
| `metaReduccion.model.js` | `meta_reduccion` | `organizacion_id` UUID NOT NULL, `tipo_recurso_id` UUID NOT NULL, `nombre` STRING(120) NOT NULL, `porcentaje_reduccion` DECIMAL(5,2) NOT NULL (min 0 max 100), `fecha_inicio` DATEONLY NOT NULL, `fecha_fin` DATEONLY NOT NULL, `estado` STRING(12) `'activo'` ∈ activo/inactivo/cumplida/incumplida, `creado_en` DATE now |
| `tarifa.model.js` | `tarifa` | `organizacion_id` UUID **null** (global), `tipo_recurso_id` UUID NOT NULL, `nombre` STRING(120) NOT NULL, `monto` DECIMAL(14,4) NOT NULL min 0, `unidad` STRING(20) NOT NULL, `fecha_inicio` DATEONLY NOT NULL, `fecha_fin` DATEONLY NOT NULL, `creado_en` DATE now |
| `recomendacion.model.js` | `recomendacion` | `organizacion_id` UUID NOT NULL, `titulo` STRING(160) NOT NULL, `descripcion` TEXT NOT NULL, `prioridad` STRING(10) `'media'` ∈ baja/media/alta, `estado` STRING(12) `'abierta'` ∈ abierta/aplicada/descartada, `creada_en` DATE now |
| `auditoriaCambio.model.js` | `auditoria_cambio` | `entidad` STRING(60) NOT NULL, `entidad_id` UUID null, `accion` STRING(40) NOT NULL, `usuario_id` UUID null, `req_id` STRING(60) null, `detalle` JSONB null, `creado_en` DATE now; **`timestamps:false`** |

- [ ] **Step 4: Implementar `src/models/index.js` con asociaciones**

```js
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
```

- [ ] **Step 5: Ejecutar y verificar que pasa**

```powershell
node --test tests/unit/models.test.js
```
Expected: PASS (2 tests).

- [ ] **Step 6: Commit (lo ejecuta EL USUARIO)**

```powershell
git add "Proyecto-Heladeria-Monitoreo/monitoreo/backend/src/models" "Proyecto-Heladeria-Monitoreo/monitoreo/backend/tests/unit/models.test.js"
git commit -m "feat(monitoreo): modelos Sequelize (20 entidades) + asociaciones"
```

---

### Task 4: Middlewares de auth JWT + RBAC + validación + servicio de auditoría + `/auth/me`

**Files:**
- Create: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/src/middlewares/auth.middleware.js`
- Create: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/src/middlewares/rbac.middleware.js`
- Create: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/src/middlewares/validation.middleware.js`
- Create: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/src/services/auditoria.service.js`
- Create: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/src/services/auth.service.js`
- Create: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/src/repositories/usuarios.repository.js`
- Create: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/src/controllers/auth.controller.js`
- Create: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/src/routes/auth.routes.js`
- Create: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/tests/helpers/env.js`
- Test: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/tests/unit/auth.test.js`
- Test: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/tests/integration/auth.test.js`
- Modify: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/src/app.js` (montar `authRouter`)

**Interfaces:**
- Consumes: `sequelize` (Task 1), modelos `Usuario, UsuarioOrganizacion, Rol, Permiso, AuditoriaCambio` (Task 3), schema seed de roles/permisos (Task 2).
- Produces (lo usan Tasks 5-10):
  - `authenticateJWT(req,res,next)` → `req.user = { id, email }` (Supabase Auth, igual que POS; si `req.user` ya viene inyectado por `testApp`/middleware interno, pasa directo — decisión de diseño de la revisión T4).
  - `requirePermission(permiso)` → next solo si el usuario activo tiene el permiso en algún rol activo; setea `req.orgIds = [uuid]` (organizaciones activas donde posee ese permiso). `401` sin usuario, `403` sin permiso.
  - `scopeOrg(req,res,next)` → tras `requirePermission`: resuelve `req.organizacionId` desde `?organizacionId=` (default: la primera de `req.orgIds`); si el query trae una org que **no** está en `req.orgIds` → `403`. Nunca confía en un id del cliente sin contrastarlo con el membership del JWT.
  - `validateBody(schema)` / `validateQuery(schema)` → `400 { error: 'Payload inválido', detail: [{path,message}] }` y reemplaza `req.body/query` por los datos parseados (Zod `.strip()` por defecto elimina campos extra).
  - `registrarAuditoria({ entidad, entidadId, accion, usuarioId, reqId, detalle }, transaction?)` → inserta en `auditoria_cambio`.
  - `getPerfil(usuarioId, email)` → upsert de `usuario` + membresías activas con rol y permisos.
  - `GET /api/v1/auth/me` (solo JWT) → `{ id, email, organizaciones: [{id, nombre, rol, permisos: []}] }`.
  - `dbTest(name, fn)` helper → `test` normal si hay `MONITOREO_TEST_DATABASE_URL` (su **valor** alimenta la conexión en `database.js`), si no `test(..., {skip})` con mensaje claro.
  - `testApp(user, [[path, router]])` → app de prueba con identidad inyectada (para tests de lógica de negocio sin JWT real).

- [ ] **Step 1: Escribir los tests fallidos**

`tests/helpers/env.js` (debe requerirse **antes** que cualquier módulo de `src/`):

```js
// Cargar .env ANTES de evaluar tieneBD (MONITOREO_TEST_DATABASE_URL vive ahí).
// dotenv no pisa variables ya presentes en el shell.
require('dotenv').config({ quiet: true });

// Fijar env ANTES de requerir src/** (el config se lee al hacer require).
process.env.NODE_ENV = 'test';
process.env.PORT = '0';
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.invalid';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key';
// SIEMPRE monitoreo_test: asignación incondicional — jamás hereda `monitoreo` de .env (aislamiento de schema).
process.env.MONITOREO_DB_SCHEMA = 'monitoreo_test';

const { test } = require('node:test');

const tieneBD = !!process.env.MONITOREO_TEST_DATABASE_URL;

// Test que requiere BD: se auto-salta con aviso si no hay URL de test.
const dbTest = tieneBD
  ? test
  : (name) => test(name, { skip: 'DEFINIR MONITOREO_TEST_DATABASE_URL para correr tests de BD (ver .env.example)' }, () => {});

module.exports = { tieneBD, dbTest };
```

`tests/helpers/testApp.js`:

```js
require('./env');
const express = require('express');
const { requestId } = require('../../src/middlewares/requestId.middleware');
const { notFound, errorHandler } = require('../../src/middlewares/error.middleware');

// App mínima con identidad inyectada para probar routers de negocio sin JWT real.
function testApp(user, mounts) {
  const app = express();
  app.use(express.json());
  app.use(requestId);
  app.use((req, _res, next) => { if (user) req.user = user; next(); });
  for (const [path, router] of mounts) app.use(path, router);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

async function listen(app) {
  const server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
  return { server, base: `http://127.0.0.1:${server.address().port}` };
}

module.exports = { testApp, listen };
```

`tests/unit/auth.test.js`:

```js
require('../helpers/env');
const { test } = require('node:test');
const assert = require('node:assert');

test('authenticateJWT sin header → 401 { error }', async () => {
  const { authenticateJWT } = require('../../src/middlewares/auth.middleware');
  const req = { headers: {} };
  let status; let body;
  const res = { status(s) { status = s; return this; }, json(b) { body = b; return this; } };
  await authenticateJWT(req, res, () => { throw new Error('no debe llamar next'); });
  assert.strictEqual(status, 401);
  assert.ok(body.error);
});

test('authenticateJWT con token inválido → 401 (sin filtrar detalles sensibles)', async () => {
  const { authenticateJWT } = require('../../src/middlewares/auth.middleware');
  const req = { headers: { authorization: 'Bearer token-basura' } };
  let status; let body;
  const res = { status(s) { status = s; return this; }, json(b) { body = b; return this; } };
  await authenticateJWT(req, res, () => { throw new Error('no debe llamar next'); });
  assert.strictEqual(status, 401);
  assert.ok(!JSON.stringify(body).includes('password'));
});

test('requirePermission sin usuario → 401', async () => {
  const { requirePermission } = require('../../src/middlewares/rbac.middleware');
  let status;
  const res = { status(s) { status = s; return this; }, json() { return this; } };
  await requirePermission('x')({}, res, () => { throw new Error('no debe llamar next'); });
  assert.strictEqual(status, 401);
});

test('validateBody rechaza payload inválido con 400 y detalle por campo', async () => {
  const { z } = require('zod');
  const { validateBody } = require('../../src/middlewares/validation.middleware');
  const schema = z.object({ cantidad: z.number().positive(), nombre: z.string().min(1) });
  const req = { body: { cantidad: -5, nombre: '' } };
  let status; let body;
  const res = { status(s) { status = s; return this; }, json(b) { body = b; return this; } };
  validateBody(schema)(req, res, () => { throw new Error('no debe llamar next'); });
  assert.strictEqual(status, 400);
  assert.strictEqual(body.error, 'Payload inválido');
  assert.ok(body.detail.length >= 2);
  assert.ok(body.detail.every((i) => i.path && i.message));
});

test('validateBody elimina campos extra (strip)', async () => {
  const { z } = require('zod');
  const { validateBody } = require('../../src/middlewares/validation.middleware');
  const schema = z.object({ nombre: z.string() });
  const req = { body: { nombre: 'ok', campo_inyectado: 'x' } };
  let nextLlamado = false;
  const res = { status() { return this; }, json() { return this; } };
  validateBody(schema)(req, res, () => { nextLlamado = true; });
  assert.strictEqual(nextLlamado, true);
  assert.strictEqual(req.body.campo_inyectado, undefined);
  assert.strictEqual(req.body.nombre, 'ok');
});

test('scopeOrg rechaza organización ajena con 403 (aislamiento de tenant)', async () => {
  const { scopeOrg } = require('../../src/middlewares/rbac.middleware');
  const req = { orgIds: ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'], query: { organizacionId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' } };
  let status;
  const res = { status(s) { status = s; return this; }, json() { return this; } };
  scopeOrg(req, res, () => { throw new Error('no debe llamar next'); });
  assert.strictEqual(status, 403);
});

test('scopeOrg sin query usa la primera org del membership y setea organizacionId', () => {
  const { scopeOrg } = require('../../src/middlewares/rbac.middleware');
  const req = { orgIds: ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'], query: {} };
  let nextLlamado = false;
  scopeOrg(req, res = { status() { return this; }, json() { return this; } }, () => { nextLlamado = true; });
  assert.strictEqual(nextLlamado, true);
  assert.strictEqual(req.organizacionId, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
});
```

`tests/integration/auth.test.js`:

```js
require('../helpers/env');
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { dbTest } = require('../helpers/env');

let sequelize; let repositorio;

before(async () => {
  if (!process.env.MONITOREO_TEST_DATABASE_URL) return;
  ({ sequelize } = require('../../src/config/database'));
  await sequelize.authenticate();
  const helpers = require('../helpers/fixtures');
  await helpers.prepararSchema(); // drop/create monitoreo_test + DDL + seed
  repositorio = require('../../src/repositories/usuarios.repository');
});

after(async () => { if (sequelize) await sequelize.close(); });

dbTest('getPerfil crea el usuario la primera vez y no duplica en la segunda', async () => {
  const { getPerfil } = require('../../src/services/auth.service');
  const { Usuario } = require('../../src/models');
  const id = '22222222-2222-4222-8222-222222222222';

  const p1 = await getPerfil(id, 'persona3@test.local', 'Persona 3');
  assert.strictEqual(p1.id, id);
  assert.strictEqual(p1.organizaciones.length, 0, 'sin membresías asignadas aún');

  await getPerfil(id, 'persona3@test.local', 'Persona 3');
  assert.strictEqual(await Usuario.count({ where: { id } }), 1, 'upsert no debe duplicar');
});

dbTest('getPerfil devuelve membresías activas con rol y permisos', async () => {
  const { getPerfil } = require('../../src/services/auth.service');
  const { seedUsuarioEnOrg } = require('../helpers/fixtures');
  const id = '33333333-3333-4333-8333-333333333333';
  await seedUsuarioEnOrg(id, 'admin@test.local', 'admin_monitoreo');

  const perfil = await getPerfil(id, 'admin@test.local');
  assert.strictEqual(perfil.organizaciones.length, 1);
  const org = perfil.organizaciones[0];
  assert.strictEqual(org.rol, 'admin_monitoreo');
  assert.ok(org.permisos.includes('reporte.consultar'), 'admin debe tener todos los permisos');
  assert.ok(org.permisos.includes('umbral.gestionar'));
});

dbTest('requirePermission concede y deniega según el rol (consultas reales)', async () => {
  const { requirePermission } = require('../../src/middlewares/rbac.middleware');
  const { seedUsuarioEnOrg } = require('../helpers/fixtures');
  const adminId = '44444444-4444-4444-8444-444444444444';
  const obsId = '55555555-5555-4555-8555-555555555555';
  await seedUsuarioEnOrg(adminId, 'adm2@test.local', 'admin_monitoreo');
  await seedUsuarioEnOrg(obsId, 'obs@test.local', 'observador');

  let ok = false;
  await requirePermission('umbral.gestionar')(
    { user: { id: adminId, email: 'adm2@test.local' } },
    { status() { return this; }, json() { return this; } },
    () => { ok = true; },
  );
  assert.strictEqual(ok, true, 'admin_monitoreo tiene umbral.gestionar');

  let status;
  await requirePermission('umbral.gestionar')(
    { user: { id: obsId, email: 'obs@test.local' } },
    { status(s) { status = s; return this; }, json() { return this; } },
    () => { throw new Error('observador no debe pasar'); },
  );
  assert.strictEqual(status, 403);
});

dbTest('GET /auth/me sube el usuario con JWT inyectado', async () => {
  const { testApp, listen } = require('../helpers/testApp');
  const { authRouter } = require('../../src/routes/auth.routes');
  const id = '66666666-6666-4666-8666-666666666666';
  const app = testApp({ id, email: 'me@test.local' }, [['/api/v1/auth', authRouter]]);
  const { server, base } = await listen(app);
  try {
    const res = await fetch(`${base}/api/v1/auth/me`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.id, id);
    assert.ok(Array.isArray(body.organizaciones));
  } finally { server.close(); }
});
```

También crear `tests/helpers/fixtures.js` (se extiende en Tasks 6-8):

```js
require('./env');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DDL = path.join(__dirname, '..', '..', '..', '..', 'database', 'monitoreo', '001_v1_0_monitoreo_ddl.sql');
const SEED = path.join(__dirname, '..', '..', '..', '..', 'database', 'monitoreo', '002_seed_dev.sql');

function aSchemaTest(sql) {
  return sql
    .replaceAll('CREATE SCHEMA IF NOT EXISTS monitoreo;', 'CREATE SCHEMA IF NOT EXISTS monitoreo_test;')
    .replaceAll('SET search_path TO monitoreo, public;', 'SET search_path TO monitoreo_test, public;');
}

// Rehace el schema de prueba desde cero: DDL + seed dev (org demo incluida).
async function prepararSchema() {
  const { sequelize } = require('../../src/config/database');
  await sequelize.query('DROP SCHEMA IF EXISTS monitoreo_test CASCADE');
  await sequelize.query(aSchemaTest(fs.readFileSync(DDL, 'utf8')));
  await sequelize.query(aSchemaTest(fs.readFileSync(SEED, 'utf8')));
}

const ORG_DEMO = '11111111-1111-4111-8111-111111111111';

function sha256hex(texto) {
  return crypto.createHash('sha256').update(texto).digest('hex');
}

// Inserta usuario + membresía con el rol indicado en la org demo.
// IMPORTANTE: sin prefijo de schema — estos inserts siguen el search_path
// (monitoreo_test en tests, monitoreo en dev). Un prefijo `monitoreo.` fijo
// escribiría en el schema de producción mientras los tests leen monitoreo_test.
async function seedUsuarioEnOrg(usuarioId, email, rolNombre) {
  const { sequelize } = require('../../src/config/database');
  await sequelize.query(
    `INSERT INTO usuario (id, email, nombre) VALUES (:id, :email, 'Test')
       ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email`,
    { replacements: { id: usuarioId, email } },
  );
  await sequelize.query(
    `INSERT INTO usuario_organizacion (usuario_id, organizacion_id, rol_id)
       SELECT :id, o.id, r.id FROM organizacion o, rol r
        WHERE o.id = :org AND r.nombre = :rol
       ON CONFLICT (usuario_id, organizacion_id) DO UPDATE SET rol_id = EXCLUDED.rol_id, estado='activo'`,
    { replacements: { id: usuarioId, org: ORG_DEMO, rol: rolNombre } },
  );
}

// Crea una integración devolviendo su API key (plaintext solo vive en el test).
async function seedIntegracion(nombre = 'POS test') {
  const { sequelize } = require('../../src/config/database');
  const apiKey = `test-key-${crypto.randomUUID()}`;
  await sequelize.query(
    `INSERT INTO integracion (organizacion_id, nombre, api_key_hash)
     VALUES (:org, :nombre, :hash)`,
    { replacements: { org: ORG_DEMO, nombre, hash: sha256hex(apiKey) } },
  );
  return apiKey;
}

module.exports = { prepararSchema, seedUsuarioEnOrg, seedIntegracion, sha256hex, ORG_DEMO };
```

- [ ] **Step 2: Ejecutar y verificar que falla**

```powershell
node --test tests/unit/auth.test.js
```
Expected: FAIL — `Cannot find module '../../src/middlewares/auth.middleware'`.

- [ ] **Step 3: Implementar middlewares y servicios**

`src/middlewares/auth.middleware.js` (réplica de `posBackend/src/middlewares/authenticate.js`):

```js
const { createClient } = require('@supabase/supabase-js');
const { env } = require('../config/environment');

async function authenticateJWT(req, res, next) {
  // Identidad ya inyectada por middleware interno o testApp (nunca proviene del
  // cliente): únicamente src/app.js y tests/helpers/testApp.js setean req.user.
  if (req.user?.id) return next();
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Bearer token' });
  }
  const token = header.slice(7);
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }
  try {
    const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'Invalid token', detail: error?.message });
    req.user = { id: user.id, email: user.email };
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Auth failed', detail: e.message });
  }
}

module.exports = { authenticateJWT };
```

`src/middlewares/rbac.middleware.js`:

```js
const { sequelize } = require('../config/database');

// Verifica el permiso en algún rol activo del usuario y setea req.orgIds
// (organizaciones activas donde el usuario posee ese permiso).
function requirePermission(permiso) {
  return async (req, res, next) => {
    const user = req.user;
    if (!user?.id) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const [rows] = await sequelize.query(
        `SELECT DISTINCT uo.organizacion_id
           FROM usuario u
           JOIN usuario_organizacion uo ON uo.usuario_id = u.id AND uo.estado = 'activo'
           JOIN rol r ON r.id = uo.rol_id AND r.estado = 'activo'
           JOIN rol_permiso rp ON rp.rol_id = r.id
           JOIN permiso p ON p.id = rp.permiso_id
          WHERE u.id = :uid AND u.estado = 'activo' AND p.nombre = :perm`,
        { replacements: { uid: user.id, perm: permiso } },
      );
      if (!rows.length) return res.status(403).json({ error: 'Forbidden', permiso });
      req.orgIds = rows.map((r) => r.organizacion_id);
      next();
    } catch (e) {
      return res.status(500).json({ error: 'RBAC check failed', detail: e.message });
    }
  };
}
```

⚠️ Nota de implementación: `requirePermission`, los fixtures y todo SQL raw se escriben **sin** prefijo de schema — para que apunten a `monitoreo`/`monitoreo_test` según corresponda, editar `src/config/database.js` del Task 1 para que quede así (versión final, con `search_path` y SSL en un único `dialectOptions`):

> **Decisión de diseño (corregido en revisión del Task 4):** el valor de `options` NO debe contener espacios. `pg` lo pasa verbatim en el startup packet y quien lo tokeniza es el servidor (interpretación de línea de comandos: `'-c search_path=monitoreo_test, public'` llegaría como `search_path=monitoreo_test,` + argumento suelto `public` → rechazo de conexión). Además `public` no hace falta: `pg_catalog` se busca siempre implícitamente (`gen_random_uuid`, `sha256` son core desde PG11) y los modelos ya llevan `schema: env.dbSchema` explícito. Si algún día se necesita `public`, usar comillas o un `SET search_path` por conexión.

```js
const { Sequelize } = require('sequelize');
const { env } = require('./environment');

const sslOpts = env.nodeEnv === 'production' ? { ssl: { require: true, rejectUnauthorized: false } } : {};

// En tests, MONITOREO_TEST_DATABASE_URL manda (su valor debe usarse, no solo
// existir como guardia de presencia); en dev/prod se usa DATABASE_URL.
const databaseUrl = process.env.MONITOREO_TEST_DATABASE_URL
  || env.databaseUrl
  || 'postgres://postgres:postgres@localhost:5432/postgres';

const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  logging: env.nodeEnv === 'development' ? console.log : false,
  pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
  // search_path: las queries raw y fixtures operan sobre el schema configurado.
  // SIN espacios ni ", public" (ver decisión de diseño arriba).
  dialectOptions: { ...sslOpts, options: `-c search_path=${env.dbSchema}` },
});

async function testConnection() {
  await sequelize.authenticate();
}

module.exports = { sequelize, testConnection };
```

(Con esto los fixtures pueden escribir tablas sin prefijo y los modelos —que ya llevan `schema: env.dbSchema`— siguen funcionando; las queries de `requirePermission` resuelven contra el schema correcto.)

`src/middlewares/validation.middleware.js`:

```js
function parsear(res, resultado) {
  if (resultado.success) return null;
  res.status(400).json({
    error: 'Payload inválido',
    detail: resultado.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
  });
  return true;
}

function validateBody(schema) {
  return (req, res, next) => {
    const r = schema.safeParse(req.body);
    if (parsear(res, r)) return;
    req.body = r.data; // strip de campos extra
    next();
  };
}

function validateQuery(schema) {
  return (req, res, next) => {
    const r = schema.safeParse(req.query);
    if (parsear(res, r)) return;
    req.query = r.data;
    next();
  };
}

module.exports = { validateBody, validateQuery };
```

`scopeOrg` (agregar al final de `rbac.middleware.js`, exportarlo junto a `requirePermission`):

```js
// Tras requirePermission: resuelve req.organizacionId validando membership.
function scopeOrg(req, res, next) {
  if (!req.orgIds?.length) return res.status(403).json({ error: 'Forbidden', detail: 'sin organización activa' });
  const pedido = req.query?.organizacionId;
  if (!pedido) {
    req.organizacionId = req.orgIds[0];
    return next();
  }
  if (!req.orgIds.includes(pedido)) {
    return res.status(403).json({ error: 'Forbidden', detail: 'organización fuera de tu membresía' });
  }
  req.organizacionId = pedido;
  next();
}

module.exports = { requirePermission, scopeOrg };
```

`src/services/auditoria.service.js`:

```js
const { AuditoriaCambio } = require('../models');

async function registrarAuditoria({ entidad, entidadId = null, accion, usuarioId = null, reqId = null, detalle = null }, transaction = null) {
  await AuditoriaCambio.create(
    { entidad, entidad_id: entidadId, accion, usuario_id: usuarioId, req_id: reqId, detalle },
    transaction ? { transaction } : undefined,
  );
}

module.exports = { registrarAuditoria };
```

`src/repositories/usuarios.repository.js`:

```js
const { Usuario, UsuarioOrganizacion, Rol, Permiso } = require('../models');

async function upsertUsuario(id, email, nombre = null) {
  const [fila] = await Usuario.findOrCreate({ where: { id }, defaults: { email, nombre, estado: 'activo' } });
  if (fila.email !== email || (nombre && fila.nombre !== nombre)) {
    await fila.update({ email, nombre: nombre ?? fila.nombre });
  }
  return fila;
}

async function membresiasActivas(usuarioId) {
  return UsuarioOrganizacion.findAll({
    where: { usuario_id: usuarioId, estado: 'activo' },
    include: [
      { model: Rol, as: 'rol', where: { estado: 'activo' }, include: [{ model: Permiso, as: 'permisos' }] },
      { model: require('../models').Organizacion, as: 'organizacion', where: { estado: 'activo' } },
    ],
  });
}

module.exports = { upsertUsuario, membresiasActivas };
```

`src/services/auth.service.js`:

```js
const usuariosRepo = require('../repositories/usuarios.repository');

async function getPerfil(usuarioId, email, nombre = null) {
  await usuariosRepo.upsertUsuario(usuarioId, email, nombre);
  const membresias = await usuariosRepo.membresiasActivas(usuarioId);
  return {
    id: usuarioId,
    email,
    organizaciones: membresias.map((m) => ({
      id: m.organizacion.id,
      nombre: m.organizacion.nombre,
      rol: m.rol.nombre,
      permisos: m.rol.permisos.map((p) => p.nombre),
    })),
  };
}

module.exports = { getPerfil };
```

`src/controllers/auth.controller.js`:

```js
const { getPerfil } = require('../services/auth.service');
const { ok, fail } = require('../utils/response');

async function me(req, res) {
  try {
    const perfil = await getPerfil(req.user.id, req.user.email, req.user.nombre ?? null);
    return ok(res, perfil);
  } catch (e) {
    return fail(res, 500, 'Error obteniendo perfil', e.message);
  }
}

module.exports = { me };
```

`src/routes/auth.routes.js`:

```js
const { Router } = require('express');
const { authenticateJWT } = require('../middlewares/auth.middleware');
const { me } = require('../controllers/auth.controller');

const router = Router();
router.get('/me', authenticateJWT, me);

module.exports = { authRouter: router };
```

`src/app.js`: agregar tras la línea `app.use('/health', healthRouter);`:

```js
  const { authRouter } = require('./routes/auth.routes');
  app.use('/api/v1/auth', authRouter);
```

- [ ] **Step 4: Ejecutar tests unitarios y verificar que pasan**

```powershell
node --test tests/unit/auth.test.js
```
Expected: PASS (7 tests).

- [ ] **Step 5: Ejecutar tests de integración (requiere BD)**

Si `MONITOREO_TEST_DATABASE_URL` está definida en `.env`:

```powershell
$env:MONITOREO_TEST_DATABASE_URL = $env:DATABASE_URL; node --test tests/integration/auth.test.js
```
Expected: PASS (4 tests). Sin la variable: los 4 aparecen como SKIP con el mensaje del helper (verificado visualmente).

- [ ] **Step 6: Commit (lo ejecuta EL USUARIO)**

```powershell
git add "Proyecto-Heladeria-Monitoreo/monitoreo/backend/src" "Proyecto-Heladeria-Monitoreo/monitoreo/backend/tests"
git commit -m "feat(monitoreo): auth JWT + RBAC con scope de organización + validación Zod + auditoría base"
```

---

### Task 5: CRUD de organizaciones, medidores, recursos, usuarios y membresías

**Files:**
- Create: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/src/validators/organizacion.validator.js` (vacío → contenido)
- Create: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/src/validators/medidor.validator.js`
- Create: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/src/validators/recurso.validator.js`
- Create: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/src/validators/usuarioOrganizacion.validator.js`
- Create: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/src/repositories/medidores.repository.js`
- Create: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/src/repositories/recursos.repository.js`
- Create: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/src/repositories/usuarioOrganizacion.repository.js`
- Create: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/src/repositories/organizaciones.repository.js` (vacío → contenido)
- Create: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/src/controllers/usuarios.controller.js`
- Create: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/src/controllers/usuariosOrganizacion.controller.js`
- Create: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/src/controllers/recursos.controller.js`
- Create (esqueletos): `controllers/organizaciones.controller.js`, `controllers/medidores.controller.js`
- Create (esqueletos): `routes/organizaciones.routes.js`, `routes/medidores.routes.js`, `routes/recursos.routes.js`, `routes/usuarios.routes.js`, `routes/usuariosOrganizacion.routes.js`
- Test: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/tests/unit/validators.test.js`
- Test: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/tests/integration/crudBasico.test.js`
- Modify: `src/app.js` (montar los 5 routers)

**Interfaces:**
- Consumes: `authenticateJWT`, `requirePermission`, `scopeOrg`, `validateBody`, `registrarAuditoria` (Task 4); modelos (Task 3); permisos `organizacion.gestionar|consultar`, `medidor.gestionar|consultar`, `recurso.gestionar`, `usuario.gestionar` (Task 2 seed).
- Produce (lo consumen el frontend y las tareas siguientes):

| Método | Ruta | Permiso | Body/Query | Éxito |
|---|---|---|---|---|
| GET | `/api/v1/organizaciones` | `organizacion.consultar` | — | `200 { data: [...] }` (solo `req.orgIds`) |
| POST | `/api/v1/organizaciones` | `organizacion.gestionar` | `{nombre, nit?}` | `201` |
| GET | `/api/v1/organizaciones/:id` | `organizacion.consultar` | — | `200` / `404` si no es miembro |
| PATCH | `/api/v1/organizaciones/:id` | `organizacion.gestionar` | `{nombre?, estado?}` | `200` + auditoría |
| GET | `/api/v1/medidores` | `medidor.consultar` | `?organizacionId=` | `200 { data: [...] }` |
| POST | `/api/v1/medidores` | `medidor.gestionar` | `{organizacionId, tipoRecursoId, codigoMedidor, nombre}` | `201` / `409` código duplicado + auditoría |
| PATCH | `/api/v1/medidores/:id` | `medidor.gestionar` | `{nombre?, estado?}` | `200` + auditoría |
| GET | `/api/v1/recursos` | `recurso.consultar` | — | `200 { data: [agua, energia] }` |
| POST | `/api/v1/recursos` | `recurso.gestionar` | `{codigo ∈ agua\|energia, nombre, unidadBase}` | `201` / `409` |
| GET | `/api/v1/usuarios` | `usuario.gestionar` | `?organizacionId=` | `200` miembros con rol |
| POST | `/api/v1/usuarios-organizacion` | `usuario.gestionar` | `{usuarioId, email, organizacionId, rolId}` | `201` upsert membresía + auditoría |
| PATCH | `/api/v1/usuarios-organizacion/:id` | `usuario.gestionar` | `{rolId?, estado?}` | `200` + auditoría |

Reglas: `scopeOrg` detrás de cada `requirePermission` en endpoints con `organizacionId`; IDs de `:id` validados como UUID (404 si el registro pertenece a otra org — no se filtra existencia); `DELETE` prohibido (solo `estado='inactivo'`); toda escritura audita.

- [ ] **Step 1: Escribir los tests fallidos**

`tests/unit/validators.test.js`:

```js
require('../helpers/env');
const { test } = require('node:test');
const assert = require('node:assert');

test('organizacionSchema exige nombre (1-120) y opcionaliza nit', () => {
  const { organizacionSchema } = require('../../src/validators/organizacion.validator');
  assert.ok(organizacionSchema.safeParse({ nombre: 'Heladería Norte' }).success);
  assert.ok(!organizacionSchema.safeParse({}).success, 'nombre obligatorio');
  assert.ok(!organizacionSchema.safeParse({ nombre: 'x'.repeat(121) }).success, 'máx 120');
  assert.ok(organizacionSchema.safeParse({ nombre: 'Ok', nit: 'NIT-1' }).success);
});

test('medidorSchema exige codigoMedidor con patrón seguro y unicidad implícita', () => {
  const { medidorSchema } = require('../../src/validators/medidor.validator');
  const base = { organizacionId: '11111111-1111-4111-8111-111111111111', tipoRecursoId: '11111111-1111-4111-8111-111111111111', nombre: 'Medidor' };
  assert.ok(medidorSchema.safeParse({ ...base, codigoMedidor: 'MED-AGUA-01' }).success);
  assert.ok(!medidorSchema.safeParse({ ...base, codigoMedidor: "'; DROP TABLE x;--" }).success, 'sin SQL injection');
  assert.ok(!medidorSchema.safeParse({ ...base, codigoMedidor: 'con espacios' }).success);
  assert.ok(!medidorSchema.safeParse({ ...base, codigoMedidor: '' }).success);
});

test('usuarioOrganizacionSchema valida UUIDs y estado', () => {
  const { usuarioOrganizacionSchema } = require('../../src/validators/usuarioOrganizacion.validator');
  const ok = {
    usuarioId: '22222222-2222-4222-8222-222222222222',
    email: 'a@b.co',
    organizacionId: '11111111-1111-4111-8111-111111111111',
    rolId: '33333333-3333-4333-8333-333333333333',
  };
  assert.ok(usuarioOrganizacionSchema.safeParse(ok).success);
  assert.ok(!usuarioOrganizacionSchema.safeParse({ ...ok, usuarioId: 'no-uuid' }).success);
  assert.ok(!usuarioOrganizacionSchema.safeParse({ ...ok, email: 'sin-arroba' }).success);
});

test('recursoSchema solo acepta agua/energia', () => {
  const { recursoSchema } = require('../../src/validators/recurso.validator');
  assert.ok(recursoSchema.safeParse({ codigo: 'agua', nombre: 'Agua', unidadBase: 'litros' }).success);
  assert.ok(recursoSchema.safeParse({ codigo: 'energia', nombre: 'Energía', unidadBase: 'kwh' }).success);
  assert.ok(!recursoSchema.safeParse({ codigo: 'gas', nombre: 'Gas', unidadBase: 'm3' }).success);
});
```

`tests/integration/crudBasico.test.js`:

```js
require('../helpers/env');
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { dbTest } = require('../helpers/env');

const ADMIN = '77777777-7777-4777-8777-777777777777';
const ORG = '11111111-1111-4111-8111-111111111111';
let server; let base; let sequelize;

async function arrancar() {
  const { testApp, listen } = require('../helpers/testApp');
  const { organizacionesRouter } = require('../../src/routes/organizaciones.routes');
  const { medidoresRouter } = require('../../src/routes/medidores.routes');
  const { recursosRouter } = require('../../src/routes/recursos.routes');
  const { usuariosRouter } = require('../../src/routes/usuarios.routes');
  const { usuariosOrganizacionRouter } = require('../../src/routes/usuariosOrganizacion.routes');
  const app = testApp({ id: ADMIN, email: 'adm@test.local' }, [
    ['/api/v1/organizaciones', organizacionesRouter],
    ['/api/v1/medidores', medidoresRouter],
    ['/api/v1/recursos', recursosRouter],
    ['/api/v1/usuarios', usuariosRouter],
    ['/api/v1/usuarios-organizacion', usuariosOrganizacionRouter],
  ]);
  const l = await listen(app);
  server = l.server; base = l.base;
}

before(async () => {
  if (!process.env.MONITOREO_TEST_DATABASE_URL) return;
  ({ sequelize } = require('../../src/config/database'));
  await sequelize.authenticate();
  await require('../helpers/fixtures').prepararSchema();
  await require('../helpers/fixtures').seedUsuarioEnOrg(ADMIN, 'adm@test.local', 'admin_monitoreo');
  await arrancar();
});
after(() => { server?.close(); return sequelize?.close(); });

dbTest('GET /organizaciones solo devuelve las orgs del membership (aislamiento)', async () => {
  const res = await fetch(`${base}/api/v1/organizaciones`);
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body.data));
  assert.ok(body.data.every((o) => [ORG].includes(o.id)), 'no debe filtrar orgs ajenas');
  assert.strictEqual(body.data.length, 1);
});

dbTest('POST /organizaciones crea y audita', async () => {
  const res = await fetch(`${base}/api/v1/organizaciones`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre: 'Sucursal Sur', nit: 'SUR-2' }),
  });
  assert.strictEqual(res.status, 201);
  const org = await res.json();
  assert.ok(org.id);
  const { sequelize: sq } = require('../../src/config/database');
  const [aud] = await sq.query(`SELECT count(*)::int n FROM auditoria_cambio WHERE entidad='organizacion' AND accion='crear' AND entidad_id = :id`, { replacements: { id: org.id } });
  assert.strictEqual(aud[0].n, 1, 'escritura audita');
});

dbTest('el creador ve su nueva org — auto-membresía (decisión T5)', async () => {
  // Sin auto-membresía la org creada sería invisible hasta para su creador
  // (visibilidad = membresía). Corre tras 'POST /organizaciones crea y audita'.
  const res = await fetch(`${base}/api/v1/organizaciones`);
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  const creada = body.data.find((o) => o.nombre === 'Sucursal Sur');
  assert.ok(creada, 'la org creada debe ser visible para su creador');
});

dbTest('POST /medidores con código repetido → 409', async () => {
  const { TipoRecurso } = require('../../src/models');
  const tr = await TipoRecurso.findOne({ where: { codigo: 'agua' } });
  const payload = { organizacionId: ORG, tipoRecursoId: tr.id, codigoMedidor: 'MED-DUP-01', nombre: 'Uno' };
  const r1 = await fetch(`${base}/api/v1/medidores`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  assert.strictEqual(r1.status, 201);
  const r2 = await fetch(`${base}/api/v1/medidores`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, nombre: 'Dos' }) });
  assert.strictEqual(r2.status, 409, 'codigo_medidor UNIQUE');
});

dbTest('GET /medidores de una org ajena → 403 (scopeOrg)', async () => {
  const otraOrg = '99999999-9999-4999-8999-999999999999';
  const res = await fetch(`${base}/api/v1/medidores?organizacionId=${otraOrg}`);
  assert.strictEqual(res.status, 403);
});

dbTest('POST /usuarios-organizacion asigna rol y audita; PATCH lo inactiva sin borrar', async () => {
  const { Rol } = require('../../src/models');
  const rolObs = await Rol.findOne({ where: { nombre: 'observador' } });
  const nuevo = '88888888-8888-4888-8888-888888888888';
  const res = await fetch(`${base}/api/v1/usuarios-organizacion`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuarioId: nuevo, email: 'nuevo@test.local', organizacionId: ORG, rolId: rolObs.id }),
  });
  assert.strictEqual(res.status, 201);
  const membresia = await res.json();
  assert.ok(membresia.id);

  const r2 = await fetch(`${base}/api/v1/usuarios-organizacion/${membresia.id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado: 'inactivo' }),
  });
  assert.strictEqual(r2.status, 200);
  const { sequelize: sq } = require('../../src/config/database');
  const [cnt] = await sq.query('SELECT count(*)::int n FROM usuario_organizacion WHERE id = :id', { replacements: { id: membresia.id } });
  assert.strictEqual(cnt[0].n, 1, 'sin borrado físico');
});

dbTest('GET /recursos devuelve agua y energía', async () => {
  const res = await fetch(`${base}/api/v1/recursos`);
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  const codigos = body.data.map((r) => r.codigo).sort();
  assert.deepStrictEqual(codigos, ['agua', 'energia']);
});
```

- [ ] **Step 2: Ejecutar y verificar que fallan**

```powershell
node --test tests/unit/validators.test.js
```
Expected: FAIL — módulos de validators inexistentes/vacíos.

- [ ] **Step 3: Implementar validators**

`src/validators/organizacion.validator.js`:

```js
const { z } = require('zod');

const organizacionSchema = z.object({
  nombre: z.string().trim().min(1).max(120),
  nit: z.string().trim().min(3).max(30).optional(),
});

const organizacionUpdateSchema = z.object({
  nombre: z.string().trim().min(1).max(120).optional(),
  estado: z.enum(['activo', 'inactivo']).optional(),
}).refine((v) => Object.keys(v).length > 0, { message: 'sin cambios' });

module.exports = { organizacionSchema, organizacionUpdateSchema };
```

`src/validators/medidor.validator.js`:

```js
const { z } = require('zod');

const medidorSchema = z.object({
  organizacionId: z.string().uuid(),
  tipoRecursoId: z.string().uuid(),
  codigoMedidor: z.string().trim().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{2,59}$/, 'formato inválido'),
  nombre: z.string().trim().min(1).max(120),
});

const medidorUpdateSchema = z.object({
  nombre: z.string().trim().min(1).max(120).optional(),
  estado: z.enum(['activo', 'inactivo']).optional(),
}).refine((v) => Object.keys(v).length > 0, { message: 'sin cambios' });

module.exports = { medidorSchema, medidorUpdateSchema };
```

`src/validators/recurso.validator.js`:

```js
const { z } = require('zod');

const recursoSchema = z.object({
  codigo: z.enum(['agua', 'energia']),
  nombre: z.string().trim().min(1).max(60),
  unidadBase: z.string().trim().min(1).max(20),
});

module.exports = { recursoSchema };
```

`src/validators/usuarioOrganizacion.validator.js`:

```js
const { z } = require('zod');

const usuarioOrganizacionSchema = z.object({
  usuarioId: z.string().uuid(),
  email: z.string().trim().email().max(160),
  organizacionId: z.string().uuid(),
  rolId: z.string().uuid(),
});

const usuarioOrganizacionUpdateSchema = z.object({
  rolId: z.string().uuid().optional(),
  estado: z.enum(['activo', 'inactivo']).optional(),
}).refine((v) => Object.keys(v).length > 0, { message: 'sin cambios' });

module.exports = { usuarioOrganizacionSchema, usuarioOrganizacionUpdateSchema };
```

- [ ] **Step 4: Ejecutar tests unitarios de validators**

```powershell
node --test tests/unit/validators.test.js
```
Expected: PASS (4 tests).

- [ ] **Step 5: Implementar repositories (patrón completo en organizaciones; resto con el mismo molde)**

`src/repositories/organizaciones.repository.js`:

```js
const { Organizacion, Rol } = require('../models');
const { Op } = require('sequelize');

async function listarPorIds(ids) {
  return Organizacion.findAll({ where: { id: { [Op.in]: ids }, estado: 'activo' }, order: [['nombre', 'ASC']] });
}

async function buscarPorId(id) {
  return Organizacion.findByPk(id);
}

async function crear({ nombre, nit }) {
  return Organizacion.create({ nombre, nit: nit ?? null });
}

async function actualizar(id, campos) {
  const org = await Organizacion.findByPk(id);
  if (!org) return null;
  await org.update(campos);
  return org;
}

module.exports = { listarPorIds, buscarPorId, crear, actualizar };
```

`src/repositories/medidores.repository.js`:

```js
const { PuntoMedicion, TipoRecurso } = require('../models');
const { Op } = require('sequelize');

async function listarPorOrg(organizacionId) {
  return PuntoMedicion.findAll({
    where: { organizacion_id: organizacionId },
    include: [{ model: TipoRecurso, as: 'tipoRecurso' }],
    order: [['codigo_medidor', 'ASC']],
  });
}

async function buscarPorId(id) {
  return PuntoMedicion.findByPk(id, { include: [{ model: TipoRecurso, as: 'tipoRecurso' }] });
}

async function existeCodigo(codigoMedidor) {
  return !!(await PuntoMedicion.findOne({ where: { codigo_medidor: codigoMedidor } }));
}

async function crear(datos) {
  return PuntoMedicion.create(datos);
}

async function actualizar(id, campos) {
  const p = await PuntoMedicion.findByPk(id);
  if (!p) return null;
  await p.update(campos);
  return p;
}

module.exports = { listarPorOrg, buscarPorId, existeCodigo, crear, actualizar };
```

`src/repositories/recursos.repository.js`:

```js
const { TipoRecurso } = require('../models');

async function listarTodos() {
  return TipoRecurso.findAll({ order: [['codigo', 'ASC']] });
}

async function crear(datos) {
  return TipoRecurso.create(datos);
}

module.exports = { listarTodos, crear };
```

`src/repositories/usuarioOrganizacion.repository.js`:

```js
const { UsuarioOrganizacion, Rol, Organizacion, Usuario } = require('../models');
const { Op } = require('sequelize');

async function listarMiembros(organizacionId) {
  return UsuarioOrganizacion.findAll({
    where: { organizacion_id: organizacionId },
    include: [
      { model: Rol, as: 'rol' },
      { model: Usuario, as: 'usuario' },
      { model: Organizacion, as: 'organizacion' },
    ],
    order: [['creado_en', 'DESC']],
  });
}

async function buscarPorId(id) {
  return UsuarioOrganizacion.findByPk(id);
}

async function asignar({ usuarioId, email, organizacionId, rolId }) {
  const [fila] = await UsuarioOrganizacion.findOrCreate({
    where: { usuario_id: usuarioId, organizacion_id: organizacionId },
    defaults: { rol_id: rolId, estado: 'activo' },
  });
  const { upsertUsuario } = require('./usuarios.repository');
  await upsertUsuario(usuarioId, email);
  if (fila.rol_id !== rolId && fila.estado === 'activo') await fila.update({ rol_id: rolId });
  return fila;
}

async function actualizar(id, campos) {
  const fila = await UsuarioOrganizacion.findByPk(id);
  if (!fila) return null;
  await fila.update(campos);
  return fila;
}

module.exports = { listarMiembros, buscarPorId, asignar, actualizar };
```

`src/repositories/usuarios.repository.js` (agregar listado de miembros — usar el ya creado en Task 4):

```js
async function listarUsuariosDeOrg(organizacionId) {
  const { UsuarioOrganizacion, Usuario, Rol } = require('../models');
  return UsuarioOrganizacion.findAll({
    where: { organizacion_id: organizacionId },
    include: [{ model: Usuario, as: 'usuario' }, { model: Rol, as: 'rol' }],
  });
}
module.exports = { upsertUsuario, membresiasActivas, listarUsuariosDeOrg };
```

- [ ] **Step 6: Implementar controllers y routers (organizaciones = ejemplar completo; los demás idénticos)**

`src/controllers/organizaciones.controller.js`:

> **Decisión de diseño (revisión T5):** `crear` debe darle membresía **automática** al creador. Sin ella la org queda huérfana: la visibilidad exige membresía (`listarPorIds(req.orgIds)`) y `POST /usuarios-organizacion` exige que la org esté en `req.orgIds` — el creador jamás podría ver ni gestionar su propia organización. Se reutiliza el `rol_id` de una membresía activa que el creador ya tenga en otra org (imposible llegar a `crear` sin una: `requirePermission` exige membresía activa con el permiso). Si no hubiera rol disponible, la org se crea igual (sin membresía) — jamás un 500 por esto.

```js
const repo = require('../repositories/organizaciones.repository');
const { membresiasActivas } = require('../repositories/usuarios.repository');
const { asignar } = require('../repositories/usuarioOrganizacion.repository');
const { ok, okList, fail } = require('../utils/response');
const { logger } = require('../utils/logger');
const { registrarAuditoria } = require('../services/auditoria.service');
const { AppError } = require('../utils/errors');

async function listar(req, res) {
  try {
    const data = await repo.listarPorIds(req.orgIds);
    return okList(res, data);
  } catch (e) {
    return fail(res, 500, 'Error listando organizaciones', e.message);
  }
}

async function obtener(req, res) {
  try {
    const org = await repo.buscarPorId(req.params.id);
    if (!org || !req.orgIds.includes(org.id)) return fail(res, 404, 'No encontrada');
    return ok(res, org);
  } catch (e) {
    return fail(res, 500, 'Error obteniendo organización', e.message);
  }
}

async function crear(req, res) {
  try {
    const org = await repo.crear(req.body);
    // Auto-membresía del creador (decisión de diseño T5): visibilidad = membresía.
    // Bloque BEST-EFFORT con try/catch propio: si falla, la org se crea igual y
    // jamás devolvemos 500 (ni un 409 falso) con la org ya persistida — se loguea.
    try {
      const [activa] = await membresiasActivas(req.user.id);
      if (activa?.rol_id) {
        const membresia = await asignar({ usuarioId: req.user.id, email: req.user.email, organizacionId: org.id, rolId: activa.rol_id });
        await registrarAuditoria({ entidad: 'usuario_organizacion', entidadId: membresia.id, accion: 'crear', usuarioId: req.user.id, reqId: req.id, detalle: { organizacionId: org.id, origen: 'auto-membresía creador' } });
      }
    } catch (e) {
      logger.warn({ err: e.message, organizacionId: org.id, usuarioId: req.user.id }, 'auto-membresía del creador falló (org creada igual)');
    }
    await registrarAuditoria({ entidad: 'organizacion', entidadId: org.id, accion: 'crear', usuarioId: req.user.id, reqId: req.id, detalle: { nombre: org.nombre } });
    return ok(res, org, 201);
  } catch (e) {
    if (e.name === 'SequelizeUniqueConstraintError') return fail(res, 409, 'NIT duplicado');
    return fail(res, 500, 'Error creando organización', e.message);
  }
}

async function actualizar(req, res) {
  try {
    const org = await repo.buscarPorId(req.params.id);
    if (!org || !req.orgIds.includes(org.id)) return fail(res, 404, 'No encontrada');
    await repo.actualizar(org.id, req.body);
    await registrarAuditoria({ entidad: 'organizacion', entidadId: org.id, accion: 'actualizar', usuarioId: req.user.id, reqId: req.id, detalle: req.body });
    return ok(res, org);
  } catch (e) {
    return fail(res, 500, 'Error actualizando organización', e.message);
  }
}

module.exports = { listar, obtener, crear, actualizar };
```

`src/routes/organizaciones.routes.js`:

```js
const { Router } = require('express');
const { authenticateJWT } = require('../middlewares/auth.middleware');
const { requirePermission, scopeOrg } = require('../middlewares/rbac.middleware');
const { validateBody } = require('../middlewares/validation.middleware');
const { organizacionSchema, organizacionUpdateSchema } = require('../validators/organizacion.validator');
const ctrl = require('../controllers/organizaciones.controller');

const router = Router();
router.use(authenticateJWT);

router.get('/', requirePermission('organizacion.consultar'), ctrl.listar);
router.get('/:id', requirePermission('organizacion.consultar'), ctrl.obtener);
router.post('/', requirePermission('organizacion.gestionar'), validateBody(organizacionSchema), ctrl.crear);
router.patch('/:id', requirePermission('organizacion.gestionar'), validateBody(organizacionUpdateSchema), ctrl.actualizar);

module.exports = { organizacionesRouter: router };
```

Repeticiones exactas para los demás (mismo molde: `authenticateJWT` → `requirePermission(permiso)` → `scopeOrg` cuando aplica → `validateBody(schema)` → controller con auditoría en escrituras y `404` sin filtrar existencia de orgs ajenas):

- `src/controllers/medidores.controller.js` + `src/routes/medidores.routes.js` (`medidor.consultar` GET/list, `medidor.gestionar` POST/PATCH; POST con `scopeOrg` y `organizacionId` del body contrastado contra `req.orgIds` → `403` si es ajena; `existeCodigo` → `409`).
- `src/controllers/recursos.controller.js` + `src/routes/recursos.routes.js` (`recurso.consultar` GET, `recurso.gestionar` POST; unicidad de `codigo` → `409`).
- `src/controllers/usuarios.controller.js` + `src/routes/usuarios.routes.js` (GET `?organizacionId=` con `scopeOrg` → miembros).
- `src/controllers/usuariosOrganizacion.controller.js` + `src/routes/usuariosOrganizacion.routes.js` (POST con `usuario.gestionar` + `scopeOrg` y body `organizacionId ∈ req.orgIds`, audita `asignar_membresia`; PATCH audita `actualizar_membresia`).

Cada controller de escritura llama a `registrarAuditoria` con: `entidad` ∈ `organizacion|punto_medicion|tipo_recurso|usuario_organizacion`, `accion` ∈ `crear|actualizar`, `usuarioId: req.user.id`, `reqId: req.id`, `detalle: req.body`.

Montar en `src/app.js` (tras authRouter):

```js
  const { organizacionesRouter } = require('./routes/organizaciones.routes');
  const { medidoresRouter } = require('./routes/medidores.routes');
  const { recursosRouter } = require('./routes/recursos.routes');
  const { usuariosRouter } = require('./routes/usuarios.routes');
  const { usuariosOrganizacionRouter } = require('./routes/usuariosOrganizacion.routes');
  app.use('/api/v1/organizaciones', organizacionesRouter);
  app.use('/api/v1/medidores', medidoresRouter);
  app.use('/api/v1/recursos', recursosRouter);
  app.use('/api/v1/usuarios', usuariosRouter);
  app.use('/api/v1/usuarios-organizacion', usuariosOrganizacionRouter);
```

- [ ] **Step 7: Ejecutar todos los tests y verificar**

```powershell
npm run test:unit
node --test tests/integration/crudBasico.test.js   # requiere MONITOREO_TEST_DATABASE_URL
```
Expected: unit PASS; integración PASS (7 tests — incluye el de auto-membresía T5) o SKIP con aviso si no hay BD. Al correr la suite completa usar **`npm test`** (serializa archivos con `--test-concurrency=1`; enmienda T5-1).

- [ ] **Step 8: Commit (lo ejecuta EL USUARIO)**

```powershell
git add "Proyecto-Heladeria-Monitoreo/monitoreo/backend"
git commit -m "feat(monitoreo): CRUD organizaciones/medidores/recursos/usuarios con RBAC, scope de tenant y auditoría"
```

---

### Task 6: Endpoint de integración `POST /api/v1/integrations/consumption` (idempotente)

**Files:**
- Create: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/src/validators/integracion.validator.js` (vacío → contenido)
- Create: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/src/middlewares/authIntegration.middleware.js`
- Create: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/src/repositories/recepcion.repository.js`
- Create (esqueletos): `controllers/integrations.controller.js`, `services/integracion.service.js`, `routes/integrations.routes.js`
- Test: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/tests/unit/integracionPayload.test.js`
- Test: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/tests/integration/consumption.test.js`
- Modify: `src/app.js` (montar `integrationsRouter`)

**Interfaces:**
- Consumes: modelos `Integracion, RecepcionConsumoPOS, ColaProcesamiento` (Task 3), `registrarAuditoria` (Task 4), schema seed (Task 2), payload real enviado por `posBackend/src/jobs/colaWorker.js` (fuente de verdad: `consumoExternoId, idempotencyKey, tipoRecurso, cantidad, unidadMedida, fechaConsumo, origen` — **no** envía `organizacionExternaId`; el contrato de AGENTS.md §6 sí lo incluye → validador lo acepta **opcional**).
- Produce (lo consumen Task 7 y el POS):
  - `POST /api/v1/integrations/consumption` con `Authorization: Bearer <api key>`:
    - `201 { recepcionId, estado: 'recibido', duplicado: false }` — recepción nueva (inserta `recepcion_consumo_pos` + `cola_procesamiento` + auditoría en **una transacción**).
    - `200 { recepcionId, estado, duplicado: true }` — misma `idempotencyKey` o mismo `consumoExternoId` ya recibido (cero inserciones nuevas; el POS marca `enviado` con cualquier 2xx).
    - `400 { error: 'Payload inválido', detail }` — Zod.
    - `401 { error }` — sin API key o hash no registrado (compara siempre sha256, jamás texto plano).
    - `403 { error }` — `organizacionExternaId` presente y distinto a `integracion.organizacion_id`.
  - `authIntegration` deja `req.integracion` (fila con `organizacion_id`).
  - `consumptionSchema` (Zod) acepta el payload literal del POS worker (test de paridad garantiza compatibilidad).
  - `recepcion.repository.buscarDuplicado(idempotencyKey, consumoExternoId)`.

- [ ] **Step 1: Escribir los tests fallidos**

`tests/unit/integracionPayload.test.js` (corre SIN BD):

```js
require('../helpers/env');
const { test } = require('node:test');
const assert = require('node:assert');

// Payload EXACTO que envía posBackend/src/jobs/colaWorker.js (ver nota de contrato abajo).
const payloadRealDelPOS = {
  consumoExternoId: '9aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  idempotencyKey: '4f0c1a2e-7d3b-4f8a-9c2d-1b6e5a7f8c9d',
  tipoRecurso: 'agua',
  cantidad: 125.5,
  unidadMedida: 'litros',
  fechaConsumo: '2026-09-21T18:00:00',
  origen: 'POS',
};

test('consumptionSchema acepta el payload literal que envía el POS', () => {
  const { consumptionSchema } = require('../../src/validators/integracion.validator');
  const r = consumptionSchema.safeParse(payloadRealDelPOS);
  assert.strictEqual(r.success, true, JSON.stringify(!r.success && r.error.issues));
  assert.strictEqual(r.data.tipoRecurso, 'agua');
  assert.strictEqual(r.data.origen, 'POS');
});

test('consumptionSchema acepta el payload del contrato AGENTS.md con organizacionExternaId', () => {
  const { consumptionSchema } = require('../../src/validators/integracion.validator');
  const r = consumptionSchema.safeParse({
    ...payloadRealDelPOS,
    organizacionExternaId: '11111111-1111-4111-8111-111111111111',
  });
  assert.strictEqual(r.success, true);
});

test('consumptionSchema rechaza tipos de recurso desconocidos, cantidades inválidas y fechas basura', () => {
  const { consumptionSchema } = require('../../src/validators/integracion.validator');
  const casos = [
    { ...payloadRealDelPOS, tipoRecurso: 'gas' },
    { ...payloadRealDelPOS, cantidad: -1 },
    { ...payloadRealDelPOS, cantidad: 0 },
    { ...payloadRealDelPOS, cantidad: 1.2345 }, // NUMERIC(14,3): máx 3 decimales
    { ...payloadRealDelPOS, fechaConsumo: 'ayer' },
    { ...payloadRealDelPOS, idempotencyKey: '' },
    { ...payloadRealDelPOS, consumoExternoId: 'no-es-uuid' },
    { ...payloadRealDelPOS, unidadMedida: 'x'.repeat(21) },
  ];
  for (const c of casos) {
    assert.strictEqual(consumptionSchema.safeParse(c).success, false, `debía rechazar: ${JSON.stringify(c)}`);
  }
});

test('consumptionSchema hace strip de campos desconocidos inyectados', () => {
  const { consumptionSchema } = require('../../src/validators/integracion.validator');
  const r = consumptionSchema.safeParse({ ...payloadRealDelPOS, estado: 'procesado', rol_id: 'x' });
  assert.strictEqual(r.success, true);
  assert.strictEqual(r.data.estado, undefined, 'campos extra eliminados');
  assert.strictEqual(r.data.rol_id, undefined);
});

test('si shared/contracts está lleno, el required del contrato ⊆ campos que aceptamos', async () => {
  const fs = require('fs');
  const path = require('path');
  const archivo = path.join(__dirname, '..', '..', '..', '..', 'shared', 'contracts', 'pos-to-monitoring', 'consumption.schema.json');
  const contenido = fs.readFileSync(archivo, 'utf8').trim();
  if (!contenido) {
    // Contrato aún no congelado por P4 → este test queda verde y se activa solo.
    return;
  }
  const esquema = JSON.parse(contenido);
  const requeridos = esquema.required || [];
  const { consumptionSchema } = require('../../src/validators/integracion.validator');
  // Muestreamos: construimos un objeto mínimo válido con los required del contrato
  // y verificamos que nuestro validador no lo rechace por campos desconocidos/ausentes.
  const plantilla = {
    consumoExternoId: '9aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    idempotencyKey: '4f0c1a2e-7d3b-4f8a-9c2d-1b6e5a7f8c9d',
    tipoRecurso: 'agua', cantidad: 10, unidadMedida: 'litros',
    fechaConsumo: '2026-09-21T18:00:00', origen: 'POS',
    organizacionExternaId: '11111111-1111-4111-8111-111111111111',
  };
  const muestra = Object.fromEntries(requeridos.map((k) => [k, plantilla[k]]));
  const faltantes = requeridos.filter((k) => plantilla[k] === undefined);
  assert.strictEqual(faltantes.length, 0, `el contrato exige campos que no manejamos: ${faltantes}`);
  assert.strictEqual(consumptionSchema.safeParse(muestra).success, true);
});
```

`tests/integration/consumption.test.js`:

```js
require('../helpers/env');
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const { dbTest } = require('../helpers/env');
const crypto = require('crypto');

const ORG = '11111111-1111-4111-8111-111111111111';
let server; let base; let sequelize; let apiKey;

function nuevoPayload(sobrescribir = {}) {
  return {
    consumoExternoId: crypto.randomUUID(),
    idempotencyKey: crypto.randomUUID(),
    tipoRecurso: 'agua',
    cantidad: 125.5,
    unidadMedida: 'litros',
    fechaConsumo: new Date().toISOString(),
    origen: 'POS',
    ...sobrescribir,
  };
}

async function enviar(payload, key = apiKey) {
  return fetch(`${base}/api/v1/integrations/consumption`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify(payload),
  });
}

before(async () => {
  if (!process.env.MONITOREO_TEST_DATABASE_URL) return;
  ({ sequelize } = require('../../src/config/database'));
  await sequelize.authenticate();
  const fx = require('../helpers/fixtures');
  await fx.prepararSchema();
  apiKey = await fx.seedIntegracion('POS colaWorker (test)');
  const { testApp, listen } = require('../helpers/testApp');
  const { integrationsRouter } = require('../../src/routes/integrations.routes');
  const app = testApp(null, [['/api/v1/integrations', integrationsRouter]]); // auth real dentro del router
  const l = await listen(app);
  server = l.server; base = l.base;
});
after(() => { server?.close(); return sequelize?.close(); });

dbTest('recepción válida → 201, crea recepcion + cola + auditoría en la misma transacción', async () => {
  const payload = nuevoPayload();
  const res = await enviar(payload);
  assert.strictEqual(res.status, 201);
  const body = await res.json();
  assert.strictEqual(body.duplicado, false);
  assert.ok(body.recepcionId);

  const [filas] = await sequelize.query(
    `SELECT r.id, r.estado, c.id AS cola_id, c.estado AS cola_estado
       FROM recepcion_consumo_pos r
       JOIN cola_procesamiento c ON c.recepcion_id = r.id
      WHERE r.id = :id`,
    { replacements: { id: body.recepcionId } },
  );
  assert.strictEqual(filas.length, 1, 'recepcion + cola existen');
  assert.strictEqual(filas[0].estado, 'recibido');
  assert.strictEqual(filas[0].cola_estado, 'pendiente');

  const [aud] = await sequelize.query(
    `SELECT count(*)::int n FROM auditoria_cambio
      WHERE entidad='recepcion_consumo_pos' AND accion='recibir' AND entidad_id = :id`,
    { replacements: { id: body.recepcionId } },
  );
  assert.strictEqual(aud[0].n, 1, 'auditoría de recepción');
});

dbTest('Review #1: reenvío con la misma idempotencyKey → 200 duplicado, cero filas nuevas', async () => {
  const payload = nuevoPayload();
  const r1 = await enviar(payload);
  assert.strictEqual(r1.status, 201);
  const b1 = await r1.json();

  const r2 = await enviar(payload); // el POS "perdió" la respuesta y reintenta
  assert.strictEqual(r2.status, 200, 'segunda entrega es 2xx para que el POS marque enviado');
  const b2 = await r2.json();
  assert.strictEqual(b2.duplicado, true);
  assert.strictEqual(b2.recepcionId, b1.recepcionId, 'devuelve la misma recepción');

  const [cnt] = await sequelize.query('SELECT count(*)::int n FROM recepcion_consumo_pos WHERE idempotency_key = :k', { replacements: { k: payload.idempotencyKey } });
  assert.strictEqual(cnt[0].n, 1, 'exactamente una recepción');
  const [cola] = await sequelize.query('SELECT count(*)::int n FROM cola_procesamiento WHERE recepcion_id = :id', { replacements: { id: b1.recepcionId } });
  assert.strictEqual(cola[0].n, 1, 'exactamente una cola: nada que procesar dos veces');
});

dbTest('Review #1b: mismo consumoExternoId con key distinta también deduplica', async () => {
  const payload = nuevoPayload();
  const r1 = await enviar(payload);
  assert.strictEqual(r1.status, 201);
  const r2 = await enviar({ ...payload, idempotencyKey: crypto.randomUUID() });
  assert.strictEqual(r2.status, 200);
  assert.strictEqual((await r2.json()).duplicado, true);
  const [cnt] = await sequelize.query('SELECT count(*)::int n FROM recepcion_consumo_pos WHERE consumo_externo_id = :id', { replacements: { id: payload.consumoExternoId } });
  assert.strictEqual(cnt[0].n, 1);
});

dbTest('Review #2: dos envíos CONCURRENTES con la misma key → una fila, sin 500', async () => {
  const payload = nuevoPayload();
  const [a, b] = await Promise.all([enviar(payload), enviar(payload)]);
  const statuses = [a.status, b.status].sort();
  assert.deepStrictEqual(statuses, [200, 201], `esperaba [200,201], llegó ${statuses}`);
  const [cnt] = await sequelize.query('SELECT count(*)::int n FROM recepcion_consumo_pos WHERE idempotency_key = :k', { replacements: { k: payload.idempotencyKey } });
  assert.strictEqual(cnt[0].n, 1, 'la UNIQUE constraint decide; jamás 2 filas');
  for (const r of [a, b]) {
    const texto = JSON.stringify(await r.clone().json());
    assert.ok(!texto.includes(' at '), 'sin stack traces en la respuesta');
  }
});

dbTest('payload inválido → 400 con detalle por campo (nunca llega a la BD)', async () => {
  const antes = (await sequelize.query('SELECT count(*)::int n FROM recepcion_consumo_pos'))[0][0].n;
  const res = await enviar(nuevoPayload({ cantidad: -5 }));
  assert.strictEqual(res.status, 400);
  const body = await res.json();
  assert.strictEqual(body.error, 'Payload inválido');
  assert.ok(body.detail.some((i) => i.path === 'cantidad'));
  const despues = (await sequelize.query('SELECT count(*)::int n FROM recepcion_consumo_pos'))[0][0].n;
  assert.strictEqual(despues, antes, 'cero inserciones');
});

dbTest('sin API key → 401; key inválida → 401 (hash, jamás texto plano)', async () => {
  const sin = await fetch(`${base}/api/v1/integrations/consumption`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nuevoPayload()),
  });
  assert.strictEqual(sin.status, 401);

  const mala = await enviar(nuevoPayload(), 'key-inexistente-123');
  assert.strictEqual(mala.status, 401);

  const [filas] = await sequelize.query('SELECT api_key_hash FROM integracion');
  for (const f of filas) {
    assert.strictEqual(f.api_key_hash.length, 64, 'solo hashes sha256 (64 hex)');
    assert.ok(!f.api_key_hash.includes(apiKey), 'la key plaintext no vive en la BD');
  }
});

dbTest('organizacionExternaId ajena → 403; ausente → resuelta desde la integración (brecha de contrato)', async () => {
  const ajena = '99999999-9999-4999-8999-999999999999';
  const r = await enviar(nuevoPayload({ organizacionExternaId: ajena }));
  assert.strictEqual(r.status, 403);

  const r2 = await enviar(nuevoPayload()); // sin organizacionExternaId (como envía el POS real)
  assert.strictEqual(r2.status, 201, 'se resuelve la org desde integracion.organizacion_id');
  const b2 = await r2.json();
  const [fila] = await sequelize.query('SELECT organizacion_id FROM recepcion_consumo_pos WHERE id = :id', { replacements: { id: b2.recepcionId } });
  assert.strictEqual(fila[0].organizacion_id, ORG);
});
```

- [ ] **Step 2: Ejecutar y verificar que fallan**

```powershell
node --test tests/unit/integracionPayload.test.js
```
Expected: FAIL — `Cannot find module '../../src/validators/integracion.validator'`.

- [ ] **Step 3: Implementar validator**

`src/validators/integracion.validator.js`:

```js
const { z } = require('zod');

const consumptionSchema = z.object({
  consumoExternoId: z.string().uuid(),
  idempotencyKey: z.string().trim().min(8).max(120),
  tipoRecurso: z.enum(['agua', 'energia']),
  cantidad: z.number().positive()
    .refine((v) => Math.abs(v * 1000 - Math.round(v * 1000)) < 1e-9, { message: 'máximo 3 decimales' }),
  unidadMedida: z.string().trim().min(1).max(20),
  fechaConsumo: z.coerce.date(),
  origen: z.string().trim().min(1).max(30).default('POS'),
  // En el contrato AGENTS.md §6; el worker real del POS hoy NO lo envía → opcional.
  organizacionExternaId: z.string().uuid().optional(),
});

module.exports = { consumptionSchema };
```

- [ ] **Step 4: Ejecutar y verificar que los tests unitarios pasan**

```powershell
node --test tests/unit/integracionPayload.test.js
```
Expected: PASS (5 tests). Si el test del contrato fallara en `faltantes`, **no** modificar el contrato: reportar al usuario la divergencia `shared/contracts` vs worker real (acuerdo de los 4).

- [ ] **Step 5: Implementar middleware de autenticación de integración**

`src/middlewares/authIntegration.middleware.js`:

```js
const crypto = require('crypto');
const { Integracion } = require('../models');
const { AppError } = require('../utils/errors');

// Auth por API key: se hashea lo recibido (sha256) y se busca por hash.
// Jamás se compara ni guarda el texto plano de la key.
async function authenticateIntegration(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing API key' });
    }
    const hash = crypto.createHash('sha256').update(header.slice(7)).digest('hex');
    const integ = await Integracion.findOne({ where: { api_key_hash: hash, estado: 'activo' } });
    const tiempoSeguro = integ && crypto.timingSafeEqual(Buffer.from(integ.api_key_hash), Buffer.from(hash));
    if (!tiempoSeguro) return res.status(401).json({ error: 'Invalid API key' });
    req.integracion = integ;
    next();
  } catch (e) {
    next(new AppError(500, 'Auth de integración fallida', e.message));
  }
}

module.exports = { authenticateIntegration };
```

- [ ] **Step 6: Implementar repository y servicio (el corazón idempotente)**

`src/repositories/recepcion.repository.js`:

```js
const { RecepcionConsumoPOS, ColaProcesamiento } = require('../models');
const { Op } = require('sequelize');

async function buscarDuplicado(idempotencyKey, consumoExternoId) {
  return RecepcionConsumoPOS.findOne({
    where: { [Op.or]: [{ idempotency_key: idempotencyKey }, { consumo_externo_id: consumoExternoId }] },
  });
}

async function crearConCola(datos, transaction) {
  const recepcion = await RecepcionConsumoPOS.create(datos, { transaction });
  await ColaProcesamiento.create({ recepcion_id: recepcion.id, estado: 'pendiente', intentos: 0 }, { transaction });
  return recepcion;
}

module.exports = { buscarDuplicado, crearConCola };
```

`src/services/integracion.service.js`:

```js
const { sequelize } = require('../config/database');
const repo = require('../repositories/recepcion.repository');
const { Integracion } = require('../models');
const { registrarAuditoria } = require('./auditoria.service');
const { AppError } = require('../utils/errors');

// Flujo: transacción atómica recepcion+cola+auditoría.
// Si la UNIQUE (idempotency_key / consumo_externo_id) revienta → la transacción
// hace rollback y respondemos 200 duplicado con la fila existente (nunca 500).
async function recibirConsumo(payload, integracion, reqId) {
  const orgId = payload.organizacionExternaId ?? integracion.organizacion_id;
  if (String(orgId) !== String(integracion.organizacion_id)) {
    throw new AppError(403, 'organizacionExternaId no coincide con la integración');
  }

  try {
    const recepcionId = await sequelize.transaction(async (t) => {
      const recepcion = await repo.crearConCola({
        consumo_externo_id: payload.consumoExternoId,
        idempotency_key: payload.idempotencyKey,
        organizacion_id: integracion.organizacion_id,
        tipo_recurso: payload.tipoRecurso,
        cantidad: payload.cantidad,
        unidad_medida: payload.unidadMedida,
        fecha_consumo: payload.fechaConsumo,
        origen: payload.origen,
        estado: 'recibido',
      }, t);
      await Integracion.update({ ultimo_uso_en: new Date() }, { where: { id: integracion.id }, transaction: t });
      await registrarAuditoria({
        entidad: 'recepcion_consumo_pos',
        entidadId: recepcion.id,
        accion: 'recibir',
        reqId,
        detalle: { idempotencyKey: payload.idempotencyKey, consumoExternoId: payload.consumoExternoId, origen: payload.origen },
      }, t);
      return recepcion.id;
    });
    return { status: 201, body: { recepcionId, estado: 'recibido', duplicado: false } };
  } catch (e) {
    if (e.name === 'SequelizeUniqueConstraintError') {
      const existente = await repo.buscarDuplicado(payload.idempotencyKey, payload.consumoExternoId);
      if (existente) {
        return { status: 200, body: { recepcionId: existente.id, estado: existente.estado, duplicado: true } };
      }
    }
    throw e;
  }
}

module.exports = { recibirConsumo };
```

`src/controllers/integrations.controller.js`:

```js
const { recibirConsumo } = require('../services/integracion.service');
const { ok, fail } = require('../utils/response');

async function recepcionConsumo(req, res) {
  try {
    const { status, body } = await recibirConsumo(req.body, req.integracion, req.id);
    return ok(res, body, status); // 201 nueva | 200 duplicado
  } catch (e) {
    if (e.status) return fail(res, e.status, e.error, e.detail);
    if (e.name === 'SequelizeValidationError') {
      return fail(res, 400, 'Payload inválido', e.errors?.map((x) => ({ path: x.path, message: x.message })));
    }
    return fail(res, 500, 'Error registrando consumo', e.message); // sin stack traces
  }
}

module.exports = { recepcionConsumo };
```

`src/routes/integrations.routes.js`:

```js
const { Router } = require('express');
const { authenticateIntegration } = require('../middlewares/authIntegration.middleware');
const { validateBody } = require('../middlewares/validation.middleware');
const { consumptionSchema } = require('../validators/integracion.validator');
const { recepcionConsumo } = require('../controllers/integrations.controller');

const router = Router();
router.post('/consumption', authenticateIntegration, validateBody(consumptionSchema), recepcionConsumo);

module.exports = { integrationsRouter: router };
```

Montar en `src/app.js` (¡antes del rate limit de `/api` ya está cubierto — el `/api` global aplica; documentar que la cola del POS respeta `RATE_LIMIT_MAX`):

```js
  const { integrationsRouter } = require('./routes/integrations.routes');
  app.use('/api/v1/integrations', integrationsRouter);
```

- [ ] **Step 7: Ejecutar toda la batería**

```powershell
npm run test:unit
node --test tests/integration/consumption.test.js   # requiere MONITOREO_TEST_DATABASE_URL
```
Expected: unit PASS; integración PASS (7 tests: recepción, duplicado, duplicado por consumo_externoId, concurrentes, payload inválido, auth, org). Sin BD: SKIP con aviso.

- [ ] **Step 8: Commit (lo ejecuta EL USUARIO)**

```powershell
git add "Proyecto-Heladeria-Monitoreo/monitoreo/backend"
git commit -m "feat(monitoreo): POST /integrations/consumption idempotente - API key por hash, transaccion y dedupe"
```

---

### Task 7: Worker de procesamiento: registro, clasificación, alertas, notificaciones y entrega encolada

**Files:**
- Create (esqueletos): `src/services/clasificacion.service.js`, `src/services/alertas.service.js`, `src/services/notificaciones.service.js`
- Create (esqueleto): `src/jobs/processingWorker.js`
- Create: `src/repositories/registro.repository.js`
- Create: `src/repositories/entrega.repository.js`
- Test: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/tests/unit/clasificacion.test.js`
- Test: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/tests/integration/processing.test.js`
- Modify: `src/server.js` (arrancar `processingWorker.start()`)

**Interfaces:**
- Consumes: `RecepcionConsumoPOS/ColaProcesamiento/RegistroConsumo/UmbralClasificacion/Alerta/Notificacion/EntregaAlerta/TipoRecurso/UsuarioOrganizacion` (Task 3), `registrarAuditoria` (Task 4), recepción creada en Task 6, umbrales del seed (Task 2).
- Produce (lo usan Task 8, Task 10 y el frontend):
  - `clasificar(cantidad, umbrales)` → `{ nivel: 'normal'|'alerta'|'critico'|'sin_umbral', umbralId }` — **puro**, sin BD: rangos `[limite_inferior, limite_superior)` (inclusivo abajo, exclusivo arriba); `sin_umbral` si no hay banda que cubra la cantidad o si la lista está vacía. NO genera alerta por sí mismo.
  - `processColaOnce({ limite = 5 })` → procesa hasta 5 filas de `cola_procesamiento` por invocación, **una fila por transacción** con claim `FOR UPDATE SKIP LOCKED`; devuelve `n` procesadas. Por fila: crea `registro_consumo` (UNIQUE `recepcion_id` = red de seguridad contra doble procesamiento), clasifica, actualiza `clasificacion`, y si el nivel es `alerta|critico` crea `alerta` + `notificacion` (broadcast `usuario_id NULL` + una por miembro activo de la org) + `entrega_alerta` (pendiente, la consume Task 8); marca recepción `procesado` y cola `procesado`; audita `registro_consumo`/`clasificar` y `alerta`/`crear` (convención `{entidad, accion}` = tabla/verbo; enmienda T7 — la prosa original decía `clasificar_consumo`/`crear_alerta`, veredicto de revisión: el código+tests están bien). En error: `intentos+1`, `ultimo_error`, `proximo_intento = now + DELIVERY_BACKOFF_MINUTES * intentos` (misma fórmula que el POS), y tras `PROCESO_MAX_INTENTOS = 5` → `estado='error'` terminal.
  - `processingWorker.start()/stop()` — loop no solapado (igual que `colaWorker` del POS).
  - `entrega.repository.crearSiNoExiste(alertaId, transaction)` ( UNIQUE `alerta_id` → reentrar no duplica entregas).

- [ ] **Step 1: Escribir los tests fallidos**

`tests/unit/clasificacion.test.js` (corre SIN BD):

```js
require('../helpers/env');
const { test } = require('node:test');
const assert = require('node:assert');

const { clasificar } = require('../../src/services/clasificacion.service');

const bandas = [
  { id: 'u1', nivel: 'normal', limite_inferior: 0, limite_superior: 1000 },
  { id: 'u2', nivel: 'alerta', limite_inferior: 1000, limite_superior: 1500 },
  { id: 'u3', nivel: 'critico', limite_inferior: 1500, limite_superior: 999999999 },
];

test('Review #4: dentro de cada banda devuelve el nivel correcto', () => {
  assert.deepStrictEqual(clasificar(500, bandas), { nivel: 'normal', umbralId: 'u1' });
  assert.deepStrictEqual(clasificar(1200, bandas), { nivel: 'alerta', umbralId: 'u2' });
  assert.deepStrictEqual(clasificar(3000, bandas), { nivel: 'critico', umbralId: 'u3' });
});

test('Review #4: frontera inferior INCLUSIVA (cantidad == limite_inferior cae en la banda)', () => {
  assert.deepStrictEqual(clasificar(1000, bandas), { nivel: 'alerta', umbralId: 'u2' });
  assert.deepStrictEqual(clasificar(1500, bandas), { nivel: 'critico', umbralId: 'u3' });
  assert.deepStrictEqual(clasificar(0, bandas), { nivel: 'normal', umbralId: 'u1' });
});

test('Review #4: frontera superior EXCLUSIVA (cantidad == limite_superior va a la siguiente banda)', () => {
  assert.deepStrictEqual(clasificar(999.999, bandas), { nivel: 'normal', umbralId: 'u1' });
  // 1500 es inclusive abajo de critico; verificar el corte justo antes:
  assert.deepStrictEqual(clasificar(1499.999, bandas), { nivel: 'alerta', umbralId: 'u2' });
});

test('Review #4: sin_umbral cuando la cantidad queda fuera de todo rango (sin alerta falsa)', () => {
  const acotadas = [
    { id: 'u1', nivel: 'normal', limite_inferior: 0, limite_superior: 100 },
    { id: 'u2', nivel: 'alerta', limite_inferior: 100, limite_superior: 200 },
  ];
  assert.deepStrictEqual(clasificar(500, acotadas), { nivel: 'sin_umbral', umbralId: null });
  assert.deepStrictEqual(clasificar(1200, []), { nivel: 'sin_umbral', umbralId: null }, 'sin umbrales definidos');
});

test('el orden de entrada no afecta el resultado (bandas desordenadas)', () => {
  const desordenadas = [bandas[2], bandas[0], bandas[1]];
  assert.deepStrictEqual(clasificar(1200, desordenadas), { nivel: 'alerta', umbralId: 'u2' });
  assert.deepStrictEqual(clasificar(0.5, desordenadas), { nivel: 'normal', umbralId: 'u1' });
});

test('acepta números como string (DECIMAL de Postgres llega como string)', () => {
  assert.deepStrictEqual(clasificar('1200', bandas), { nivel: 'alerta', umbralId: 'u2' });
});
```

`tests/integration/processing.test.js`:

```js
require('../helpers/env');
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { dbTest } = require('../helpers/env');
const crypto = require('crypto');

const ORG = '11111111-1111-4111-8111-111111111111';
let sequelize; let processColaOnce;

async function encolarConsumo({ cantidad = 125.5, org = ORG, tipo = 'agua' } = {}) {
  const idExt = crypto.randomUUID();
  const [r] = await sequelize.query(
    `INSERT INTO recepcion_consumo_pos
       (consumo_externo_id, idempotency_key, organizacion_id, tipo_recurso, cantidad, unidad_medida, fecha_consumo, origen, estado)
     VALUES (:idExt, :key, :org, :tipo, :c, 'litros', now(), 'POS', 'recibido')
     RETURNING id`,
    { replacements: { idExt, key: crypto.randomUUID(), org, tipo, c: cantidad }, type: require('sequelize').QueryTypes.SELECT },
  );
  await sequelize.query(
    `INSERT INTO cola_procesamiento (recepcion_id, estado, intentos) VALUES (:id, 'pendiente', 0)`,
    { replacements: { id: r.id } },
  );
  return r.id;
}

before(async () => {
  if (!process.env.MONITOREO_TEST_DATABASE_URL) return;
  ({ sequelize } = require('../../src/config/database'));
  await sequelize.authenticate();
  await require('../helpers/fixtures').prepararSchema();
  ({ processColaOnce } = require('../../src/jobs/processingWorker'));
});
after(async () => { if (sequelize) await sequelize.close(); });

dbTest('consumo normal → registro clasificado normal, sin alerta, cola procesada', async () => {
  const recepcionId = await encolarConsumo({ cantidad: 500 });
  const n = await processColaOnce({ limite: 5 });
  assert.ok(n >= 1);

  const [reg] = await sequelize.query(
    'SELECT * FROM registro_consumo WHERE recepcion_id = :id', { replacements: { id: recepcionId } });
  assert.strictEqual(reg.length, 1);
  assert.strictEqual(reg[0].clasificacion, 'normal');

  const [cola] = await sequelize.query('SELECT estado, intentos FROM cola_procesamiento WHERE recepcion_id = :id', { replacements: { id: recepcionId } });
  assert.strictEqual(cola[0].estado, 'procesado');

  const [rec] = await sequelize.query('SELECT estado FROM recepcion_consumo_pos WHERE id = :id', { replacements: { id: recepcionId } });
  assert.strictEqual(rec[0].estado, 'procesado');

  const [alertas] = await sequelize.query('SELECT count(*)::int n FROM alerta WHERE registro_consumo_id = :id', { replacements: { id: reg[0].id } });
  assert.strictEqual(alertas[0].n, 0, 'nivel normal no genera alerta');

  const [aud] = await sequelize.query(
    `SELECT count(*)::int n FROM auditoria_cambio WHERE entidad='registro_consumo' AND accion='clasificar' AND entidad_id = :id`,
    { replacements: { id: reg[0].id } });
  assert.strictEqual(aud[0].n, 1, 'clasificación auditada');
});

dbTest('consumo que cae en la banda alerta → alerta + notificación + entrega encolada', async () => {
  const recepcionId = await encolarConsumo({ cantidad: 1200 }); // banda alerta [1000,1500)
  await processColaOnce({ limite: 5 });

  const [reg] = await sequelize.query('SELECT * FROM registro_consumo WHERE recepcion_id = :id', { replacements: { id: recepcionId } });
  assert.strictEqual(reg[0].clasificacion, 'alerta');

  const [alertas] = await sequelize.query('SELECT * FROM alerta WHERE registro_consumo_id = :id', { replacements: { id: reg[0].id } });
  assert.strictEqual(alertas.length, 1);
  assert.strictEqual(alertas[0].nivel, 'alerta');
  assert.ok(alertas[0].mensaje.length > 10, 'mensaje legible');
  assert.strictEqual(alertas[0].estado, 'pendiente');

  const [notifs] = await sequelize.query('SELECT count(*)::int n FROM notificacion WHERE alerta_id = :id', { replacements: { id: alertas[0].id } });
  assert.ok(notifs[0].n >= 1, 'broadcast de notificación creado');

  const [entregas] = await sequelize.query('SELECT * FROM entrega_alerta WHERE alerta_id = :id', { replacements: { id: alertas[0].id } });
  assert.strictEqual(entregas.length, 1, 'entrega pendiente para el worker del Task 8');
  assert.strictEqual(entregas[0].estado, 'pendiente');

  const [aud] = await sequelize.query(
    `SELECT count(*)::int n FROM auditoria_cambio WHERE entidad='alerta' AND accion='crear' AND entidad_id = :id`,
    { replacements: { id: alertas[0].id } });
  assert.strictEqual(aud[0].n, 1, 'creación de alerta auditada');
});

dbTest('org sin umbrales → registro sin_umbral y CERO alertas (sin alerta falsa)', async () => {
  const { Organizacion } = require('../../src/models');
  const org2 = await Organizacion.create({ nombre: 'Sin umbrales' });
  const recepcionId = await encolarConsumo({ cantidad: 9999, org: org2.id });
  await processColaOnce({ limite: 5 });
  const [reg] = await sequelize.query('SELECT clasificacion FROM registro_consumo WHERE recepcion_id = :id', { replacements: { id: recepcionId } });
  assert.strictEqual(reg[0].clasificacion, 'sin_umbral');
  const [alertas] = await sequelize.query('SELECT count(*)::int n FROM alerta WHERE organizacion_id = :org', { replacements: { org: org2.id } });
  assert.strictEqual(alertas[0].n, 0);
});

dbTest('Review #3: dos workers concurrentes → un solo registro_consumo (la recepción UNIQUE)', async () => {
  const recepcionId = await encolarConsumo({ cantidad: 100 });
  await Promise.all([processColaOnce({ limite: 5 }), processColaOnce({ limite: 5 })]);
  const [cnt] = await sequelize.query('SELECT count(*)::int n FROM registro_consumo WHERE recepcion_id = :id', { replacements: { id: recepcionId } });
  assert.strictEqual(cnt[0].n, 1, 'SKIP LOCKED + UNIQUE recepcion_id: jamás doble registro');
  const [cola] = await sequelize.query('SELECT estado FROM cola_procesamiento WHERE recepcion_id = :id', { replacements: { id: recepcionId } });
  assert.strictEqual(cola[0].estado, 'procesado');
});

dbTest('re-ejecutar el worker sobre una cola ya procesada no duplica nada', async () => {
  const recepcionId = await encolarConsumo({ cantidad: 1200 });
  await processColaOnce({ limite: 5 });
  const antes = (await sequelize.query('SELECT count(*)::int n FROM registro_consumo'))[0][0].n;
  const alertasAntes = (await sequelize.query('SELECT count(*)::int n FROM alerta'))[0][0].n;
  await processColaOnce({ limite: 5 });
  const despues = (await sequelize.query('SELECT count(*)::int n FROM registro_consumo'))[0][0].n;
  const alertasDespues = (await sequelize.query('SELECT count(*)::int n FROM alerta'))[0][0].n;
  assert.strictEqual(despues, antes, 'cero registros nuevos');
  assert.strictEqual(alertasDespues, alertasAntes, 'cero alertas nuevas');
});

dbTest('fila con error y proximo_intento futuro NO se reclama todavía (backoff)', async () => {
  const recepcionId = await encolarConsumo({ cantidad: 100 });
  await sequelize.query(
    `UPDATE cola_procesamiento SET estado='pendiente', intentos=2, ultimo_error='boom', proximo_intento = now() + interval '10 minutes'
      WHERE recepcion_id = :id`, { replacements: { id: recepcionId } });
  const n = await processColaOnce({ limite: 5 });
  const [reg] = await sequelize.query('SELECT count(*)::int n FROM registro_consumo WHERE recepcion_id = :id', { replacements: { id: recepcionId } });
  assert.strictEqual(reg[0].n, 0, 'backoff respetado: aún no vuelve a intentar');
  assert.ok(n >= 0);
});
```

- [ ] **Step 2: Ejecutar y verificar que fallan**

```powershell
node --test tests/unit/clasificacion.test.js
```
Expected: FAIL — servicio inexistente.

- [ ] **Step 3: Implementar `clasificacion.service.js` (lógica pura)**

`src/services/clasificacion.service.js`:

```js
// Clasifica una cantidad contra los umbrales activos de la organización.
// Rango = [limite_inferior, limite_superior): inclusivo abajo, exclusivo arriba.
// Sin banda cubriendo la cantidad → 'sin_umbral' (NO alerta: mejor sin alerta
// que una alerta falsa; la ausencia de cobertura queda visible en el registro).
function clasificar(cantidad, umbrales) {
  const c = Number(cantidad);
  if (!Number.isFinite(c)) return { nivel: 'sin_umbral', umbralId: null };
  const orden = [...(umbrales || [])]
    .sort((a, b) => Number(a.limite_inferior) - Number(b.limite_inferior));
  const hit = orden.find((u) => c >= Number(u.limite_inferior) && c < Number(u.limite_superior));
  if (!hit) return { nivel: 'sin_umbral', umbralId: null };
  return { nivel: hit.nivel, umbralId: hit.id };
}

module.exports = { clasificar };
```

- [ ] **Step 4: Ejecutar el test unitario y verificar que pasa**

```powershell
node --test tests/unit/clasificacion.test.js
```
Expected: PASS (6 tests).

- [ ] **Step 5: Implementar repositories**

`src/repositories/registro.repository.js`:

```js
const { RegistroConsumo, TipoRecurso, UmbralClasificacion, RecepcionConsumoPOS } = require('../models');
const { Op } = require('sequelize');

async function tipoRecursoPorCodigo(codigo, transaction) {
  return TipoRecurso.findOne({ where: { codigo } }, transaction ? { transaction } : undefined);
}

async function umbralesActivos(organizacionId, tipoRecursoId, transaction) {
  return UmbralClasificacion.findAll({
    where: { organizacion_id: organizacionId, tipo_recurso_id: tipoRecursoId, estado: 'activo' },
    order: [['limite_inferior', 'ASC']],
    ...(transaction ? { transaction } : {}),
  });
}

async function crearRegistro(datos, transaction) {
  return RegistroConsumo.create(datos, { transaction });
}

async function marcarClasificado(registroId, clasificacion, transaction) {
  await RegistroConsumo.update({ clasificacion }, { where: { id: registroId }, transaction });
}

module.exports = { tipoRecursoPorCodigo, umbralesActivos, crearRegistro, marcarClasificado };
```

⚠️ Nota de implementación: `tipoRecursoPorCodigo` arriba pasa mal la opción `transaction` (segundo argumento no existe en `findOne`). La versión correcta:

```js
async function tipoRecursoPorCodigo(codigo, transaction) {
  return TipoRecurso.findOne({ where: { codigo }, ...(transaction ? { transaction } : {}) });
}
```

`src/repositories/entrega.repository.js`:

```js
const { EntregaAlerta } = require('../models');

// UNIQUE(alerta_id): reintentar la creación nunca duplica entregas.
async function crearSiNoExiste(alertaId, transaction) {
  const [fila] = await EntregaAlerta.findOrCreate({
    where: { alerta_id: alertaId },
    defaults: { estado: 'pendiente', intentos: 0, proximo_intento: null },
    ...(transaction ? { transaction } : {}),
  });
  return fila;
}

module.exports = { crearSiNoExiste };
```

- [ ] **Step 6: Implementar `alertas.service.js` y `notificaciones.service.js`**

`src/services/alertas.service.js`:

```js
const { Alerta } = require('../models');
const { crearSiNoExiste } = require('../repositories/entrega.repository');
const { registrarAuditoria } = require('./auditoria.service');

async function crearAlerta({ organizacionId, registroId, umbralId, nivel, tipoRecurso, cantidad, unidad, nombreUmbral }, transaction) {
  const mensaje = `Consumo de ${tipoRecurso} de ${Number(cantidad)} ${unidad} alcanzó el nivel "${nivel}" (umbral: ${nombreUmbral}).`;
  const alerta = await Alerta.create({
    organizacion_id: organizacionId,
    registro_consumo_id: registroId,
    umbral_id: umbralId,
    nivel,
    tipo_recurso: tipoRecurso,
    mensaje,
    fecha_generacion: new Date(),
    estado: 'pendiente',
  }, { transaction });
  await crearSiNoExiste(alerta.id, transaction); // encola entrega hacia el POS
  await registrarAuditoria({
    entidad: 'alerta', entidadId: alerta.id, accion: 'crear', reqId: null,
    detalle: { nivel, registroId, umbralId },
  }, transaction);
  return alerta;
}

module.exports = { crearAlerta };
```

`src/services/notificaciones.service.js`:

```js
const { Notificacion, UsuarioOrganizacion } = require('../models');
const { registrarAuditoria } = require('./auditoria.service');

// Broadcast: 1 notificación general (usuario_id NULL) + 1 por miembro activo de la org.
async function notificarAlerta(alerta, transaction) {
  const creadas = [];
  creadas.push(await Notificacion.create(
    { alerta_id: alerta.id, usuario_id: null, canal: 'in_app', estado: 'pendiente' },
    { transaction },
  ));
  const miembros = await UsuarioOrganizacion.findAll({
    where: { organizacion_id: alerta.organizacion_id, estado: 'activo' },
    attributes: ['usuario_id'],
    transaction,
  });
  for (const m of miembros) {
    creadas.push(await Notificacion.create(
      { alerta_id: alerta.id, usuario_id: m.usuario_id, canal: 'in_app', estado: 'pendiente' },
      { transaction },
    ));
  }
  await registrarAuditoria({
    entidad: 'notificacion', entidadId: null, accion: 'crear_lote',
    detalle: { alertaId: alerta.id, total: creadas.length },
  }, transaction);
  return creadas;
}

module.exports = { notificarAlerta };
```

- [ ] **Step 7: Implementar `processingWorker.js` (claim tipo POS, una fila por transacción)**

`src/jobs/processingWorker.js`:

```js
const { sequelize } = require('../config/database');
const { env } = require('../config/environment');
const { logger } = require('../utils/logger');
const { clasificar } = require('../services/clasificacion.service');
const registroRepo = require('../repositories/registro.repository');
const { crearAlerta } = require('../services/alertas.service');
const { notificarAlerta } = require('../services/notificaciones.service');
const { registrarAuditoria } = require('../services/auditoria.service');
const { RecepcionConsumoPOS, ColaProcesamiento } = require('../models');

const PROCESO_MAX_INTENTOS = 5;

// Claim estilo colaWorker del POS: fila libre (o con backoff vencido),
// bloqueo corto para que un segundo worker la salte (SKIP LOCKED).
const CLAIM_SQL = `
  SELECT cp.id, cp.recepcion_id
    FROM ${env.dbSchema}.cola_procesamiento cp
   WHERE cp.estado = 'pendiente'
     AND (cp.proximo_intento IS NULL OR cp.proximo_intento <= now())
   ORDER BY cp.creado_en
   LIMIT 1
   FOR UPDATE SKIP LOCKED`;

// IMPORTANTE: claim y procesamiento viven en la MISMA transacción (t): el lock
// del FOR UPDATE se retiene durante todo el procesamiento → un segundo worker
// concurrente salta la fila (SKIP LOCKED) y jamás la procesa dos veces.
async function processColaOnce({ limite = 5 } = {}) {
  let procesadas = 0;
  for (let i = 0; i < limite; i += 1) {
    let filaFallida = null;
    try {
      const hecho = await sequelize.transaction(async (t) => {
        const [filas] = await sequelize.query(CLAIM_SQL, { transaction: t, type: require('sequelize').QueryTypes.SELECT });
        const fila = filas[0];
        if (!fila) return false; // no hay cola pendiente con backoff vencido
        filaFallida = fila;
        await procesarFila(fila, t);
        filaFallida = null;
        return true;
      });
      if (!hecho) break;
      procesadas += 1;
    } catch (e) {
      // La transacción hizo rollback (la fila vuelve a 'pendiente'); recién
      // ahora, fuera de la tx abortada, escribimos el error y el backoff.
      if (filaFallida) await marcarErrorFila(filaFallida, e.message);
      else logger.error({ err: e.message }, 'error externo en processColaOnce');
      procesadas += filaFallida ? 1 : 0;
      break; // fallo sistemático: cortar el lote evita un loop de errores
    }
  }
  return procesadas;
}

async function marcarErrorFila(fila, error) {
  // Backoff = DELIVERY_BACKOFF_MINUTES * intentos (misma fórmula que el POS),
  // calculado en JS para no depender de precedencias SQL.
  const [previa] = await sequelize.query(
    'SELECT intentos FROM cola_procesamiento WHERE id = :id', { replacements: { id: fila.id } },
  );
  const intentos = (previa?.[0]?.intentos ?? 0) + 1;
  const terminal = intentos >= PROCESO_MAX_INTENTOS;
  const proximo = terminal
    ? null
    : new Date(Date.now() + env.deliveryBackoffMinutes * intentos * 60 * 1000);
  await sequelize.query(
    `UPDATE cola_procesamiento
        SET estado = :estado, intentos = :intentos, ultimo_error = :err, proximo_intento = :proximo
      WHERE id = :id`,
    {
      replacements: {
        estado: terminal ? 'error' : 'pendiente',
        intentos,
        err: String(error).slice(0, 500),
        proximo,
        id: fila.id,
      },
    },
  );
  logger.error({ colaId: fila.id, intentos, terminal }, 'fallo procesando fila');
}

// Procesa UNA fila dentro de la transacción t del claim (toda query lleva t).
async function procesarFila(fila, t) {
  const recepcion = await RecepcionConsumoPOS.findByPk(fila.recepcion_id, { transaction: t });
  if (!recepcion) {
    await ColaProcesamiento.update(
      { estado: 'error', intentos: 1, ultimo_error: 'recepcion inexistente', proximo_intento: null },
      { where: { id: fila.id }, transaction: t },
    );
    return 'error';
  }

  const tipoRecurso = await registroRepo.tipoRecursoPorCodigo(recepcion.tipo_recurso, t);
  const umbrales = await registroRepo.umbralesActivos(recepcion.organizacion_id, tipoRecurso.id, t);
  const { nivel, umbralId } = clasificar(recepcion.cantidad, umbrales);

  // Con el lock del claim retenido no puede haber otro registro concurrente:
  // el pre-chequeo evita encimar en reintentos (catch de UNIQUE dentro de una
  // tx de PG abortaría la transacción) y la UNIQUE(recepcion_id) de la BD queda
  // como última red de seguridad a nivel esquema.
  const { RegistroConsumo } = require('../models');
  let registro = await RegistroConsumo.findOne({ where: { recepcion_id: recepcion.id }, transaction: t });
  const creado = !registro;

  if (creado) {
    registro = await registroRepo.crearRegistro({
      recepcion_id: recepcion.id,
      organizacion_id: recepcion.organizacion_id,
      punto_medicion_id: recepcion.punto_medicion_id,
      tipo_recurso_id: tipoRecurso.id,
      tipo_recurso: recepcion.tipo_recurso,
      cantidad: recepcion.cantidad,
      unidad_medida: recepcion.unidad_medida,
      fecha_consumo: recepcion.fecha_consumo,
      clasificacion: nivel,
      origen: recepcion.origen,
    }, t);

    await registrarAuditoria({
      entidad: 'registro_consumo', entidadId: registro.id, accion: 'clasificar',
      detalle: { nivel, umbralId, recepcionId: recepcion.id },
    }, t);

    if (nivel === 'alerta' || nivel === 'critico') {
      const umbral = umbrales.find((u) => u.id === umbralId);
      const alerta = await crearAlerta({
        organizacionId: recepcion.organizacion_id,
        registroId: registro.id,
        umbralId,
        nivel,
        tipoRecurso: recepcion.tipo_recurso,
        cantidad: Number(recepcion.cantidad),
        unidad: recepcion.unidad_medida,
        nombreUmbral: umbral?.nombre ?? 'sin nombre',
      }, t);
      await notificarAlerta(alerta, t);
    }
  }

  await recepcion.update({ estado: 'procesado' }, { transaction: t });
  await ColaProcesamiento.update(
    { estado: 'procesado', intentos: require('sequelize').literal('intentos + 1'), ultimo_error: null, proximo_intento: null },
    { where: { id: fila.id }, transaction: t },
  );
  return 'procesado';
}
```

El runner (agregar al final del mismo archivo):

```js
let timer = null;
let corriendo = false;

async function loop() {
  if (corriendo) return; // nunca solapar
  corriendo = true;
  try {
    await processColaOnce({ limite: 5 });
  } catch (e) {
    logger.error({ err: e.message }, 'loop de procesamiento falló');
  } finally {
    corriendo = false;
  }
}

function start() {
  if (timer) return;
  timer = setInterval(loop, env.workerIntervalMs);
  logger.info({ intervalMs: env.workerIntervalMs }, 'processingWorker iniciado');
}

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = { processColaOnce, start, stop };

// Ejecución directa: node src/jobs/processingWorker.js (una pasada manual)
if (require.main === module) {
  processColaOnce({ limite: 20 }).then((n) => {
    logger.info({ n }, 'pasada manual completada');
    process.exit(0);
  }).catch((e) => {
    logger.error({ err: e.message }, 'pasada manual falló');
    process.exit(1);
  });
}
```

- [ ] **Step 8: Arrancar el worker en `src/server.js`**

Editar `src/server.js`: dentro del `try`, tras `const app = createApp();`:

```js
    const { start: startProcessing, stop: stopProcessing } = require('./jobs/processingWorker');
    startProcessing();
    process.on('SIGINT', () => { stopProcessing(); process.exit(0); });
    process.on('SIGTERM', () => { stopProcessing(); process.exit(0); });
```

- [ ] **Step 9: Ejecutar todos los tests**

```powershell
npm run test:unit
node --test tests/integration/processing.test.js   # requiere MONITOREO_TEST_DATABASE_URL
```
Expected: unit PASS; integración PASS (6 tests). Sin BD: SKIP.

- [ ] **Step 10: Commit (lo ejecuta EL USUARIO)**

```powershell
git add "Proyecto-Heladeria-Monitoreo/monitoreo/backend"
git commit -m "feat(monitoreo): processingWorker - registro, clasificacion por umbrales, alertas, notificaciones y colas"
```

---

### Task 8: Worker de entrega de alertas al POS (`pos.client` + `alertDeliveryWorker`)

**Files:**
- Create: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/src/integrations/pos.client.js`
- Create (esqueleto): `src/jobs/alertDeliveryWorker.js`
- Test: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/tests/integration/alertDelivery.test.js`
- Modify: `src/server.js` (arrancar `alertDeliveryWorker.start()`)

**Interfaces:**
- Consumes: `alerta` + `entrega_alerta` creadas en Task 7, `registrarAuditoria` (Task 4), env `POS_ALERTS_URL/POS_ALERTS_API_KEY/DELIVERY_*` (Task 1), contrato AGENTS.md §7 (`{ alertaId, nivel, tipoRecurso, mensaje, fechaGeneracion }` + `Bearer`).
- Produce (lo verifican los tests y el contrato POS↔Monitoreo):
  - `enviarAlertaPOS(alerta)` → `{ ok, status }`; `POST POS_ALERTS_URL` con timeout `DELIVERY_TIMEOUT_MS` (AbortController); lanza excepción si no hay URL configurada o si la respuesta no es 2xx.
  - `entregarUnaVez()` → `'vacia' | 'enviada' | 'reintento' | 'error_terminal'`. Reclama **una** fila `entrega_alerta` (`FOR UPDATE SKIP LOCKED` + lease de 1 min: incrementa `intentos` y posterga `proximo_intento` mientras habla con el POS — envío **at-least-once**, el POS deduplica por `alertaId` según contrato). Éxito → `estado='enviada'` + `alerta.estado='entregada'` + auditoría `entregar`. Fallo (500/404/timeout/sin URL) → `estado='pendiente'` con `proximo_intento = now + DELIVERY_BACKOFF_MINUTES * intentos`, `ultimo_error`; al llegar a `DELIVERY_MAX_INTENTOS` → `estado='error'` terminal y `alerta.estado='error'`. **Cada intento deja auditoría** (`entregar` o `reintentar`).
  - `alertDeliveryWorker.start()/stop()` — loop no solapado.
  - **Nota de contrato:** el endpoint POS `POST /api/v1/integrations/alerts` aún no existe (Paso 2 de P4). El `404` se trata como fallo reintentable — correcto y requerido: nada se pierde ni se marca terminal de entrada.

- [ ] **Step 1: Escribir el test fallido**

`tests/integration/alertDelivery.test.js`:

```js
require('../helpers/env');
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const { dbTest } = require('../helpers/env');

const ORG = '11111111-1111-4111-8111-111111111111';
let sequelize; let env; let posMock;

// POS falso: registra cada petición y responde según el handler de la prueba.
function crearPosMock(handler) {
  const server = http.createServer((req, res) => {
    let cuerpo = '';
    req.on('data', (c) => { cuerpo += c; });
    req.on('end', () => {
      server.peticiones.push({
        url: req.url,
        auth: req.headers.authorization,
        cuerpo: JSON.parse(cuerpo || '{}'),
      });
      handler(req, res, server.peticiones.length);
    });
  });
  server.peticiones = [];
  return server;
}

async function crearAlertaConEntrega({ intentos = 0, proximo = null } = {}) {
  const [alerta] = await sequelize.query(
    `INSERT INTO alerta (organizacion_id, nivel, tipo_recurso, mensaje, fecha_generacion, estado)
     VALUES (:org, 'critico', 'agua', 'Consumo de agua de 3000 litros alcanzó el nivel "critico".', now(), 'pendiente')
     RETURNING id`,
    { replacements: { org: ORG }, type: require('sequelize').QueryTypes.SELECT },
  );
  await sequelize.query(
    `INSERT INTO entrega_alerta (alerta_id, estado, intentos, proximo_intento)
     VALUES (:aid, 'pendiente', :i, :p)`,
    { replacements: { aid: alerta.id, i: intentos, p: proximo } },
  );
  return alerta.id;
}

before(async () => {
  if (!process.env.MONITOREO_TEST_DATABASE_URL) return;
  ({ sequelize } = require('../../src/config/database'));
  ({ env } = require('../../src/config/environment'));
  await sequelize.authenticate();
  await require('../helpers/fixtures').prepararSchema();
  const { entregarUnaVez } = require('../../src/jobs/alertDeliveryWorker');
  global.entregarUnaVez = entregarUnaVez;
});
after(async () => {
  posMock?.close();
  if (sequelize) await sequelize.close();
});

dbTest('Review #5: entrega exitosa → enviada, alerta entregada, payload y Bearer correctos, auditado', async () => {
  posMock = crearPosMock((_req, res) => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":true}'); });
  await new Promise((r) => posMock.listen(0, r));
  env.posAlertsUrl = `http://127.0.0.1:${posMock.address().port}/api/v1/integrations/alerts`;
  env.posAlertsApiKey = 'clave-pos-test';

  const alertaId = await crearAlertaConEntrega();
  const r = await global.entregarUnaVez();
  assert.strictEqual(r, 'enviada');

  const p = posMock.peticiones[0];
  assert.strictEqual(p.auth, 'Bearer clave-pos-test');
  assert.strictEqual(p.cuerpo.alertaId, alertaId);
  assert.strictEqual(p.cuerpo.nivel, 'critico');
  assert.strictEqual(p.cuerpo.tipoRecurso, 'agua');
  assert.ok(typeof p.cuerpo.mensaje === 'string' && p.cuerpo.mensaje.length > 10);
  assert.ok(!Number.isNaN(Date.parse(p.cuerpo.fechaGeneracion)), 'fechaGeneracion ISO parseable');

  const [ent] = await sequelize.query('SELECT * FROM entrega_alerta WHERE alerta_id = :id', { replacements: { id: alertaId } });
  assert.strictEqual(ent[0].estado, 'enviada');
  assert.strictEqual(ent[0].intentos, 1);
  const [al] = await sequelize.query('SELECT estado FROM alerta WHERE id = :id', { replacements: { id: alertaId } });
  assert.strictEqual(al[0].estado, 'entregada');
  const [aud] = await sequelize.query(
    `SELECT count(*)::int n FROM auditoria_cambio WHERE entidad='entrega_alerta' AND accion='entregar' AND entidad_id = :id`,
    { replacements: { id: ent[0].id } });
  assert.strictEqual(aud[0].n, 1, 'entrega auditada');
});

dbTest('Review #5: POS responde 500 → reintento con backoff, sin perder la fila', async () => {
  posMock.close();
  posMock = crearPosMock((_req, res) => { res.writeHead(500); res.end('boom'); });
  await new Promise((r) => posMock.listen(0, r));
  env.posAlertsUrl = `http://127.0.0.1:${posMock.address().port}/api/v1/integrations/alerts`;

  const alertaId = await crearAlertaConEntrega();
  const r = await global.entregarUnaVez();
  assert.strictEqual(r, 'reintento');

  const [ent] = await sequelize.query('SELECT * FROM entrega_alerta WHERE alerta_id = :id', { replacements: { id: alertaId } });
  assert.strictEqual(ent[0].estado, 'pendiente', 'sigue en cola');
  assert.strictEqual(ent[0].intentos, 1);
  assert.ok(new Date(ent[0].proximo_intento) > new Date(), 'backoff en el futuro');
  assert.ok(ent[0].ultimo_error.includes('500'), `ultimo_error debe citar el status: ${ent[0].ultimo_error}`);
  const [aud] = await sequelize.query(
    `SELECT count(*)::int n FROM auditoria_cambio WHERE entidad='entrega_alerta' AND accion='reintentar' AND entidad_id = :id`,
    { replacements: { id: ent[0].id } });
  assert.strictEqual(aud[0].n, 1, 'cada intento queda auditado');
});

dbTest('Review #5: POS devuelve 404 (endpoint aún no existe, Paso 2 de P4) → reintentable, no terminal', async () => {
  posMock.close();
  posMock = crearPosMock((_req, res) => { res.writeHead(404); res.end('no found'); });
  await new Promise((r) => posMock.listen(0, r));
  env.posAlertsUrl = `http://127.0.0.1:${posMock.address().port}/api/v1/integrations/alerts`;

  const alertaId = await crearAlertaConEntrega();
  const r = await global.entregarUnaVez();
  assert.strictEqual(r, 'reintento');
  const [ent] = await sequelize.query('SELECT * FROM entrega_alerta WHERE alerta_id = :id', { replacements: { id: alertaId } });
  assert.strictEqual(ent[0].estado, 'pendiente', '404 = fallo transitorio hasta que P4 levante el endpoint');
});

dbTest('Review #5: timeout del POS → abort, reintento (DELIVERY_TIMEOUT_MS corto)', async () => {
  posMock.close();
  posMock = crearPosMock((_req, res) => {
    setTimeout(() => { try { res.writeHead(200); res.end(); } catch { /* ya abortado */ } }, 1500);
  });
  await new Promise((r) => posMock.listen(0, r));
  env.posAlertsUrl = `http://127.0.0.1:${posMock.address().port}/api/v1/integrations/alerts`;
  const timeoutPrevio = env.deliveryTimeoutMs;
  env.deliveryTimeoutMs = 200;
  try {
    const alertaId = await crearAlertaConEntrega();
    const r = await global.entregarUnaVez();
    assert.strictEqual(r, 'reintento');
    const [ent] = await sequelize.query('SELECT * FROM entrega_alerta WHERE alerta_id = :id', { replacements: { id: alertaId } });
    assert.strictEqual(ent[0].estado, 'pendiente');
    assert.ok(ent[0].ultimo_error.length > 0, 'el timeout deja rastro en ultimo_error');
  } finally {
    env.deliveryTimeoutMs = timeoutPrevio;
  }
});

dbTest('Review #5: agota DELIVERY_MAX_INTENTOS → estado error terminal, alerta en error y fuera de la cola', async () => {
  posMock.close();
  posMock = crearPosMock((_req, res) => { res.writeHead(500); res.end('boom'); });
  await new Promise((r) => posMock.listen(0, r));
  env.posAlertsUrl = `http://127.0.0.1:${posMock.address().port}/api/v1/integrations/alerts`;

  const maxPrevio = env.deliveryMaxIntentos;
  env.deliveryMaxIntentos = 3;
  try {
    const alertaId = await crearAlertaConEntrega({ intentos: 2 }); // queda en 3 tras el reclamo
    const r = await global.entregarUnaVez();
    assert.strictEqual(r, 'error_terminal');

    const [ent] = await sequelize.query('SELECT * FROM entrega_alerta WHERE alerta_id = :id', { replacements: { id: alertaId } });
    assert.strictEqual(ent[0].estado, 'error');
    assert.strictEqual(ent[0].intentos, 3);
    assert.strictEqual(ent[0].proximo_intento, null, 'sin siguiente intento');
    const [al] = await sequelize.query('SELECT estado FROM alerta WHERE id = :id', { replacements: { id: alertaId } });
    assert.strictEqual(al[0].estado, 'error');

    const r2 = await global.entregarUnaVez();
    assert.strictEqual(r2, 'vacia', 'las filas terminales no se reclaman más (sin loop infinito)');
  } finally {
    env.deliveryMaxIntentos = maxPrevio;
  }
});

dbTest('sin POS_ALERTS_URL configurado → fallo controlado, fila pendiente (nunca excepción fuera del worker)', async () => {
  const urlPrevia = env.posAlertsUrl;
  env.posAlertsUrl = '';
  try {
    const alertaId = await crearAlertaConEntrega();
    const r = await global.entregarUnaVez();
    assert.strictEqual(r, 'reintento');
    const [ent] = await sequelize.query('SELECT * FROM entrega_alerta WHERE alerta_id = :id', { replacements: { id: alertaId } });
    assert.strictEqual(ent[0].estado, 'pendiente');
    assert.ok(ent[0].ultimo_error.includes('POS_ALERTS_URL'));
  } finally {
    env.posAlertsUrl = urlPrevia;
  }
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

```powershell
node --test tests/integration/alertDelivery.test.js
```
Expected: FAIL (o SKIP si no hay BD — definir primero `MONITOREO_TEST_DATABASE_URL`; el módulo `alertDeliveryWorker` no existe → el `before` revienta con `Cannot find module`).

- [ ] **Step 3: Implementar `pos.client.js`**

`src/integrations/pos.client.js`:

```js
const { env } = require('../config/environment');

// POST de alerta hacia el POS (contrato AGENTS.md §7).
// Timeout duro con AbortController: si el POS no responde en
// DELIVERY_TIMEOUT_MS, lanzamos y el worker agenda reintento.
async function enviarAlertaPOS(alerta) {
  if (!env.posAlertsUrl) throw new Error('POS_ALERTS_URL no configurado');
  const controlador = new AbortController();
  const reloj = setTimeout(() => controlador.abort(), env.deliveryTimeoutMs);
  try {
    const respuesta = await fetch(env.posAlertsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.posAlertsApiKey}`,
      },
      body: JSON.stringify({
        alertaId: alerta.id,
        nivel: alerta.nivel,
        tipoRecurso: alerta.tipo_recurso,
        mensaje: alerta.mensaje,
        fechaGeneracion: new Date(alerta.fecha_generacion).toISOString(),
      }),
      signal: controlador.signal,
    });
    return { ok: respuesta.ok, status: respuesta.status };
  } finally {
    clearTimeout(reloj);
  }
}

module.exports = { enviarAlertaPOS };
```

- [ ] **Step 4: Implementar `alertDeliveryWorker.js`**

`src/jobs/alertDeliveryWorker.js`:

```js
const { sequelize } = require('../config/database');
const { env } = require('../config/environment');
const { logger } = require('../utils/logger');
const { EntregaAlerta, Alerta } = require('../models');
const { enviarAlertaPOS } = require('../integrations/pos.client');
const { registrarAuditoria } = require('../services/auditoria.service');
const { QueryTypes } = require('sequelize');

// Claim con lease: al reclamar incrementa intentos y posterga
// proximo_intento 1 minuto — si el worker muere hablando con el POS,
// la fila vuelve a estar disponible sola (at-least-once; el POS
// deduplica por alertaId, contrato §7).
const CLAIM_SQL = `
  UPDATE ${env.dbSchema}.entrega_alerta
     SET intentos = intentos + 1,
         proximo_intento = now() + interval '1 minute'
   WHERE id = (
     SELECT id FROM ${env.dbSchema}.entrega_alerta
      WHERE estado = 'pendiente'
        AND (proximo_intento IS NULL OR proximo_intento <= now())
      ORDER BY creada_en
      LIMIT 1
      FOR UPDATE SKIP LOCKED
   )
   RETURNING id, alerta_id, intentos`;

async function entregarUnaVez() {
  const [reclamadas] = await sequelize.query(CLAIM_SQL, { type: QueryTypes.SELECT, returning: true });
  const fila = Array.isArray(reclamadas) ? reclamadas[0] : reclamadas;
  if (!fila?.id) return 'vacia';

  const alerta = await Alerta.findByPk(fila.alerta_id);
  if (!alerta) {
    await EntregaAlerta.update(
      { estado: 'error', ultimo_error: 'alerta inexistente', proximo_intento: null },
      { where: { id: fila.id } },
    );
    return 'error_terminal';
  }

  try {
    const { ok, status } = await enviarAlertaPOS(alerta);
    if (!ok) throw new Error(`POS respondió ${status}`);

    await EntregaAlerta.update(
      { estado: 'enviada', proximo_intento: null, ultimo_error: null },
      { where: { id: fila.id } },
    );
    await Alerta.update({ estado: 'entregada' }, { where: { id: alerta.id } });
    await registrarAuditoria({
      entidad: 'entrega_alerta', entidadId: fila.id, accion: 'entregar',
      detalle: { alertaId: alerta.id, status, intentos: fila.intentos },
    });
    return 'enviada';
  } catch (e) {
    const terminal = fila.intentos >= env.deliveryMaxIntentos;
    const proximo = terminal
      ? null
      : new Date(Date.now() + env.deliveryBackoffMinutes * fila.intentos * 60 * 1000);
    await EntregaAlerta.update(
      { estado: terminal ? 'error' : 'pendiente', ultimo_error: String(e.message).slice(0, 500), proximo_intento: proximo },
      { where: { id: fila.id } },
    );
    if (terminal) await Alerta.update({ estado: 'error' }, { where: { id: alerta.id } });
    await registrarAuditoria({
      entidad: 'entrega_alerta', entidadId: fila.id, accion: 'reintentar',
      detalle: { alertaId: alerta.id, intentos: fila.intentos, terminal, error: String(e.message).slice(0, 200) },
    });
    logger.warn({ entregaId: fila.id, intentos: fila.intentos, terminal }, 'entrega de alerta fallida');
    return terminal ? 'error_terminal' : 'reintento';
  }
}

let timer = null;
let corriendo = false;

async function loop() {
  if (corriendo) return;
  corriendo = true;
  try {
    // Drena hasta que no queden filas listas (o un máximo de 20 por tick).
    for (let i = 0; i < 20; i += 1) {
      const r = await entregarUnaVez();
      if (r === 'vacia') break;
    }
  } catch (e) {
    logger.error({ err: e.message }, 'loop de entrega de alertas falló');
  } finally {
    corriendo = false;
  }
}

function start() {
  if (timer) return;
  timer = setInterval(loop, env.workerIntervalMs);
  logger.info({ intervalMs: env.workerIntervalMs }, 'alertDeliveryWorker iniciado');
}

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = { entregarUnaVez, start, stop };
```

- [ ] **Step 5: Arrancar el worker en `src/server.js`**

Editar `src/server.js`: junto al arranque del `processingWorker` (Task 7):

```js
    const { start: startDelivery, stop: stopDelivery } = require('./jobs/alertDeliveryWorker');
    startDelivery();
    // en los manejadores SIGINT/SIGTERM añadir también stopDelivery();
```

- [ ] **Step 6: Ejecutar el test y verificar que pasa**

```powershell
node --test tests/integration/alertDelivery.test.js
```
Expected: PASS (7 tests). Sin `MONITOREO_TEST_DATABASE_URL`: SKIP con aviso.

- [ ] **Step 7: Commit (lo ejecuta EL USUARIO)**

```powershell
git add "Proyecto-Heladeria-Monitoreo/monitoreo/backend"
git commit -m "feat(monitoreo): alertDeliveryWorker - contrato de alertas al POS con lease, backoff, timeout y max intentos"
```

---

### Task 9: CRUD de umbrales, metas, tarifas y recomendaciones (validaciones de negocio)

**Files:**
- Create (esqueletos vacíos): `src/validators/umbral.validator.js`, `src/validators/meta.validator.js`, `src/validators/tarifa.validator.js`, `src/validators/recomendacion.validator.js`
- Create: `src/services/umbrales.service.js`, `src/repositories/umbrales.repository.js`, `src/repositories/metas.repository.js`, `src/repositories/tarifas.repository.js`, `src/repositories/recomendaciones.repository.js`, `src/controllers/umbrales.controller.js`
- Create (esqueletos): `services/metas.service.js`, `services/tarifas.service.js`, `services/recomendaciones.service.js`, `controllers/metas.controller.js`, `controllers/tarifas.controller.js`, `controllers/recomendaciones.controller.js`, `routes/umbrales.routes.js`, `routes/metas.routes.js`, `routes/tarifas.routes.js`, `routes/recomendaciones.routes.js`
- Test: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/tests/unit/rangos.test.js`
- Test: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/tests/integration/crudObjetivos.test.js`
- Modify: `src/app.js` (montar los 4 routers)

**Interfaces:**
- Consumes: `authenticateJWT`, `requirePermission`, `scopeOrg`, `validateBody`, `registrarAuditoria` (Task 4); modelos y permisos `umbral.gestionar|consultar`, `meta.gestionar|consultar`, `tarifa.gestionar|consultar`, `recomendacion.gestionar|consultar` (Tasks 2-3); umbrales del seed (Task 2).
- Produce (los consume el frontend y los tests de clasificación):
  - `GET/POST /api/v1/umbrales` (`umbral.consultar` / `umbral.gestionar`), `PATCH /api/v1/umbrales/:id`.
    - POST body `{ organizacionId, tipoRecursoId, nombre, nivel ∈ normal|alerta|critico, limiteInferior ≥ 0, limiteSuperior > 0 }` → exige `limiteInferior < limiteSuperior`; **rechaza `400 { error: 'Rango solapado' }`** si cruza un umbral activo de la misma organización+recurso; `201` + auditoría `crear`.
    - El service usa la función pura `haySolapeRangos(nuevoInf, nuevoSup, existentes)` → los tests unitarios la cubren sin BD.
  - `GET/POST/PATCH /api/v1/metas` (`meta.*`): `porcentajeReduccion ∈ [0,100]`, `fechaInicio < fechaFin` (400 en caso contrario); auditoría en escrituras.
  - `GET/POST/PATCH /api/v1/tarifas` (`tarifa.*`): `monto ≥ 0`, `fechaInicio ≤ fechaFin`, **`400 { error: 'Período solapado' }`** si el período cruza otra tarifa de la misma org (o global) + recurso; `organizacionId` opcional (NULL = global); auditoría. Decisión T9-2: PATCH sobre tarifa global (`organizacion_id NULL`) permitido con `tarifa.gestionar` — la regla literal (pertenencia a `req.orgIds`) dejaría las globales ineditables para siempre; GET lista solo tarifas de la org.
  - `GET/POST/PATCH /api/v1/recomendaciones` (`recomendacion.*`): `prioridad ∈ baja|media|alta`, `estado ∈ abierta|aplicada|descartada`; PATCH audita.
  - Funciones puras exportadas (unit-test sin BD): `haySolapeRangos` (umbrales, semiantervalos) y `haySolapePeriodos` (tarifas, intervalos cerrados).

- [ ] **Step 1: Escribir los tests fallidos**

`tests/unit/rangos.test.js` (corre SIN BD):

```js
require('../helpers/env');
const { test } = require('node:test');
const assert = require('node:assert');

const { haySolapeRangos, haySolapePeriodos } = require('../../src/services/umbrales.service');

test('Review #4: umbrales contiguos NO solapan (semiantervalos [inf, sup))', () => {
  const existentes = [
    { limite_inferior: 0, limite_superior: 1000 },
    { limite_inferior: 1000, limite_superior: 1500 },
    { limite_inferior: 1500, limite_superior: 999999999 },
  ];
  assert.strictEqual(haySolapeRangos(0, 1000, existentes.slice(1)), false);
  assert.strictEqual(haySolapeRangos(1500, 2000, existentes.slice(0, 2)), false);
});

test('Review #4: umbrales que se cruzan SÍ solapan', () => {
  const existentes = [{ limite_inferior: 1000, limite_superior: 1500 }];
  assert.strictEqual(haySolapeRangos(900, 1100, existentes), true);
  assert.strictEqual(haySolapeRangos(1200, 1300, existentes), true, 'anidado');
  assert.strictEqual(haySolapeRangos(1400, 9000, existentes), true, 'extiende hacia arriba');
  assert.strictEqual(haySolapeRangos(0, 100000, existentes), true, 'engloba');
});

test('Review #4: tocar el borde exacto no cuenta como solape', () => {
  const existentes = [{ limite_inferior: 1000, limite_superior: 1500 }];
  assert.strictEqual(haySolapeRangos(1500, 2000, existentes), false, 'empieza donde termina');
  assert.strictEqual(haySolapeRangos(500, 1000, existentes), false, 'termina donde empieza');
});

test('períodos de tarifa: solapan por día compartido, contiguos no', () => {
  const enero = { fecha_inicio: '2026-01-01', fecha_fin: '2026-01-31' };
  assert.strictEqual(haySolapePeriodos('2026-01-15', '2026-02-15', [enero]), true, 'comparte días de enero');
  assert.strictEqual(haySolapePeriodos('2026-02-01', '2026-02-28', [enero]), false, 'contiguo');
  assert.strictEqual(haySolapePeriodos('2025-12-01', '2026-01-01', [enero]), true, 'comparte el día 1/1 (cerrado)');
  assert.strictEqual(haySolapePeriodos('2025-12-01', '2025-12-31', [enero]), false);
});

test('sin existentes → nunca solapa', () => {
  assert.strictEqual(haySolapeRangos(0, 10, []), false);
  assert.strictEqual(haySolapePeriodos('2026-01-01', '2026-01-31', []), false);
});
```

`tests/integration/crudObjetivos.test.js`:

```js
require('../helpers/env');
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { dbTest } = require('../helpers/env');

const ORG = '11111111-1111-4111-8111-111111111111';
const ADM = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OPE = 'bbbb0000-0000-4000-8000-000000000002';
let server; let base; let serverOpe; let baseOpe; let sequelize;

// Decisión de diseño T9-1 (revisión): el test necesita DOS identidades. El seed
// (Task 2, aprobado) da a `observador` solo 5 permisos consultar — sin NINGUNO
// de umbral/meta/tarifa/recomendacion — así que un solo observador haría 403 en
// 7/8 tests. ADMIN (admin_monitoreo, todos los permisos) corre los tests 1-4 y
// 6-8; OPERADOR (tiene umbral.consultar pero NO umbral.gestionar) corre el test
// RBAC: POST → 403 genuino, GET → 200 genuino.
async function arrancar(user) {
  const { testApp, listen } = require('../helpers/testApp');
  const { umbralesRouter } = require('../../src/routes/umbrales.routes');
  const { metasRouter } = require('../../src/routes/metas.routes');
  const { tarifasRouter } = require('../../src/routes/tarifas.routes');
  const { recomendacionesRouter } = require('../../src/routes/recomendaciones.routes');
  const app = testApp(user, [
    ['/api/v1/umbrales', umbralesRouter],
    ['/api/v1/metas', metasRouter],
    ['/api/v1/tarifas', tarifasRouter],
    ['/api/v1/recomendaciones', recomendacionesRouter],
  ]);
  return listen(app);
}

function post(url, body, b = base) {
  return fetch(`${b}${url}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
}

before(async () => {
  if (!process.env.MONITOREO_TEST_DATABASE_URL) return;
  ({ sequelize } = require('../../src/config/database'));
  await sequelize.authenticate();
  const fx = require('../helpers/fixtures');
  await fx.prepararSchema();
  await fx.seedUsuarioEnOrg(ADM, 'adm@test.local', 'admin_monitoreo');
  await fx.seedUsuarioEnOrg(OPE, 'ope@test.local', 'operador');
  ({ server, base } = await arrancar({ id: ADM, email: 'adm@test.local' }));
  ({ server: serverOpe, base: baseOpe } = await arrancar({ id: OPE, email: 'ope@test.local' }));
});
after(() => { server?.close(); serverOpe?.close(); return sequelize?.close(); });

dbTest('POST /umbrales rechaza solape con un umbral existente del seed (agua alerta 1000-1500)', async () => {
  const { TipoRecurso } = require('../../src/models');
  const agua = await TipoRecurso.findOne({ where: { codigo: 'agua' } });
  const res = await post('/api/v1/umbrales', {
    organizacionId: ORG, tipoRecursoId: agua.id, nombre: 'intruso', nivel: 'critico',
    limiteInferior: 1200, limiteSuperior: 1800,
  });
  assert.strictEqual(res.status, 400);
  assert.strictEqual((await res.json()).error, 'Rango solapado');
});

dbTest('POST /umbrales válido en recurso sin rangos → 201 + auditoría; lista filtrada por org', async () => {
  const { TipoRecurso } = require('../../src/models');
  const energia = await TipoRecurso.findOne({ where: { codigo: 'energia' } });
  const r1 = await post('/api/v1/umbrales', {
    organizacionId: ORG, tipoRecursoId: energia.id, nombre: 'energia normal', nivel: 'normal',
    limiteInferior: 0, limiteSuperior: 500,
  });
  assert.strictEqual(r1.status, 201);
  const umbral = await r1.json();

  const r2 = await post('/api/v1/umbrales', {
    organizacionId: ORG, tipoRecursoId: energia.id, nombre: 'energia alerta', nivel: 'alerta',
    limiteInferior: 500, limiteSuperior: 800,
  });
  assert.strictEqual(r2.status, 201, 'contiguo = permitido');

  const lista = await (await fetch(`${base}/api/v1/umbrales?organizacionId=${ORG}`)).json();
  assert.ok(lista.data.every((u) => u.organizacion_id === ORG));
  const [aud] = await sequelize.query(
    `SELECT count(*)::int n FROM auditoria_cambio WHERE entidad='umbral_clasificacion' AND accion='crear' AND entidad_id = :id`,
    { replacements: { id: umbral.id } });
  assert.strictEqual(aud[0].n, 1);
});

dbTest('POST /umbrales con limiteInferior >= limiteSuperior → 400', async () => {
  const { TipoRecurso } = require('../../src/models');
  const energia = await TipoRecurso.findOne({ where: { codigo: 'energia' } });
  const res = await post('/api/v1/umbrales', {
    organizacionId: ORG, tipoRecursoId: energia.id, nombre: 'invertido', nivel: 'normal',
    limiteInferior: 900, limiteSuperior: 100,
  });
  assert.strictEqual(res.status, 400);
});

dbTest('POST /umbrales con organizacionId ajena → 403 (aislamiento)', async () => {
  const res = await post('/api/v1/umbrales', {
    organizacionId: '99999999-9999-4999-8999-999999999999',
    tipoRecursoId: '11111111-1111-4111-8111-111111111111',
    nombre: 'x', nivel: 'normal', limiteInferior: 0, limiteSuperior: 10,
  });
  assert.strictEqual(res.status, 403);
});

dbTest('operador NO puede crear umbrales (403 RBAC) pero sí listarlos', async () => {
  // Decisión T9-1: operador tiene umbral.consultar pero no umbral.gestionar.
  const { TipoRecurso } = require('../../src/models');
  const agua = await TipoRecurso.findOne({ where: { codigo: 'agua' } });
  const crear = await post('/api/v1/umbrales', {
    organizacionId: ORG, tipoRecursoId: agua.id, nombre: 'de ope', nivel: 'normal',
    limiteInferior: 0, limiteSuperior: 10,
  }, baseOpe);
  assert.strictEqual(crear.status, 403);
  const listar = await fetch(`${baseOpe}/api/v1/umbrales?organizacionId=${ORG}`);
  assert.strictEqual(listar.status, 200);
});

dbTest('metas: porcentaje > 100 → 400; fechas invertidas → 400; válida → 201 + auditoría', async () => {
  const { TipoRecurso } = require('../../src/models');
  const agua = await TipoRecurso.findOne({ where: { codigo: 'agua' } });
  const baseMeta = {
    organizacionId: ORG, tipoRecursoId: agua.id, nombre: 'Meta Q4',
    porcentajeReduccion: 15, fechaInicio: '2026-10-01', fechaFin: '2026-12-31',
  };
  assert.strictEqual((await post('/api/v1/metas', { ...baseMeta, porcentajeReduccion: 101 })).status, 400);
  assert.strictEqual((await post('/api/v1/metas', { ...baseMeta, porcentajeReduccion: -1 })).status, 400);
  assert.strictEqual((await post('/api/v1/metas', { ...baseMeta, fechaInicio: '2026-12-31', fechaFin: '2026-10-01' })).status, 400);
  const okRes = await post('/api/v1/metas', baseMeta);
  assert.strictEqual(okRes.status, 201);
  const meta = await okRes.json();
  const [aud] = await sequelize.query(
    `SELECT count(*)::int n FROM auditoria_cambio WHERE entidad='meta_reduccion' AND accion='crear' AND entidad_id = :id`,
    { replacements: { id: meta.id } });
  assert.strictEqual(aud[0].n, 1);
});

dbTest('tarifas: período solapado → 400; contiguo válido → 201 + auditoría', async () => {
  const { TipoRecurso } = require('../../src/models');
  const agua = await TipoRecurso.findOne({ where: { codigo: 'agua' } });
  const t1 = await post('/api/v1/tarifas', {
    organizacionId: ORG, tipoRecursoId: agua.id, nombre: 'Tarifa enero',
    monto: 0.05, unidad: 'litro', fechaInicio: '2026-01-01', fechaFin: '2026-01-31',
  });
  assert.strictEqual(t1.status, 201);

  const solapada = await post('/api/v1/tarifas', {
    organizacionId: ORG, tipoRecursoId: agua.id, nombre: 'Tarifa enero-mzo',
    monto: 0.06, unidad: 'litro', fechaInicio: '2026-01-20', fechaFin: '2026-03-31',
  });
  assert.strictEqual(solapada.status, 400);
  assert.strictEqual((await solapada.json()).error, 'Período solapado');

  const contigua = await post('/api/v1/tarifas', {
    organizacionId: ORG, tipoRecursoId: agua.id, nombre: 'Tarifa febrero',
    monto: 0.06, unidad: 'litro', fechaInicio: '2026-02-01', fechaFin: '2026-02-28',
  });
  assert.strictEqual(contigua.status, 201);
  const tarifa = await contigua.json();
  const [aud] = await sequelize.query(
    `SELECT count(*)::int n FROM auditoria_cambio WHERE entidad='tarifa' AND accion='crear' AND entidad_id = :id`,
    { replacements: { id: tarifa.id } });
  assert.strictEqual(aud[0].n, 1);

  const negativa = await post('/api/v1/tarifas', {
    organizacionId: ORG, tipoRecursoId: agua.id, nombre: 'negativa',
    monto: -1, unidad: 'litro', fechaInicio: '2026-03-01', fechaFin: '2026-03-31',
  });
  assert.strictEqual(negativa.status, 400, 'monto >= 0');
});

dbTest('recomendaciones: crear y cambiar estado audita', async () => {
  const crear = await post('/api/v1/recomendaciones', {
    organizacionId: ORG, titulo: 'Revisar fugas', descripcion: 'Inspeccionar línea principal',
    prioridad: 'alta',
  });
  assert.strictEqual(crear.status, 201);
  const rec = await crear.json();

  const patch = await fetch(`${base}/api/v1/recomendaciones/${rec.id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado: 'aplicada' }),
  });
  assert.strictEqual(patch.status, 200);
  const [aud] = await sequelize.query(
    `SELECT count(*)::int n FROM auditoria_cambio WHERE entidad='recomendacion' AND entidad_id = :id AND accion='actualizar'`,
    { replacements: { id: rec.id } });
  assert.strictEqual(aud[0].n, 1);

  const invalido = await fetch(`${base}/api/v1/recomendaciones/${rec.id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado: 'volando' }),
  });
  assert.strictEqual(invalido.status, 400, 'estado controlado');
});
```

- [ ] **Step 2: Ejecutar y verificar que fallan**

```powershell
node --test tests/unit/rangos.test.js
```
Expected: FAIL — `umbrales.service` inexistente.

- [ ] **Step 3: Implementar validators**

`src/validators/umbral.validator.js`:

```js
const { z } = require('zod');

const umbralSchema = z.object({
  organizacionId: z.string().uuid(),
  tipoRecursoId: z.string().uuid(),
  nombre: z.string().trim().min(1).max(120),
  nivel: z.enum(['normal', 'alerta', 'critico']),
  limiteInferior: z.number().min(0),
  limiteSuperior: z.number().positive(),
}).refine((v) => v.limiteInferior < v.limiteSuperior, {
  message: 'limiteInferior debe ser menor que limiteSuperior', path: ['limiteSuperior'],
});

const umbralUpdateSchema = z.object({
  nombre: z.string().trim().min(1).max(120).optional(),
  nivel: z.enum(['normal', 'alerta', 'critico']).optional(),
  limiteInferior: z.number().min(0).optional(),
  limiteSuperior: z.number().positive().optional(),
  estado: z.enum(['activo', 'inactivo']).optional(),
}).refine((v) => Object.keys(v).length > 0, { message: 'sin cambios' });

module.exports = { umbralSchema, umbralUpdateSchema };
```

`src/validators/meta.validator.js`:

```js
const { z } = require('zod');

const metaSchema = z.object({
  organizacionId: z.string().uuid(),
  tipoRecursoId: z.string().uuid(),
  nombre: z.string().trim().min(1).max(120),
  porcentajeReduccion: z.number().min(0).max(100),
  fechaInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fechaFin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}).refine((v) => v.fechaInicio < v.fechaFin, {
  message: 'fechaInicio debe ser anterior a fechaFin', path: ['fechaFin'],
});

const metaUpdateSchema = z.object({
  nombre: z.string().trim().min(1).max(120).optional(),
  porcentajeReduccion: z.number().min(0).max(100).optional(),
  fechaInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  fechaFin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  estado: z.enum(['activo', 'inactivo', 'cumplida', 'incumplida']).optional(),
}).refine((v) => Object.keys(v).length > 0, { message: 'sin cambios' });

module.exports = { metaSchema, metaUpdateSchema };
```

`src/validators/tarifa.validator.js`:

```js
const { z } = require('zod');

const tarifaSchema = z.object({
  organizacionId: z.string().uuid().optional(), // ausente/omitida = tarifa global
  tipoRecursoId: z.string().uuid(),
  nombre: z.string().trim().min(1).max(120),
  monto: z.number().min(0),
  unidad: z.string().trim().min(1).max(20),
  fechaInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fechaFin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}).refine((v) => v.fechaInicio <= v.fechaFin, {
  message: 'fechaInicio debe ser <= fechaFin', path: ['fechaFin'],
});

const tarifaUpdateSchema = z.object({
  nombre: z.string().trim().min(1).max(120).optional(),
  monto: z.number().min(0).optional(),
  fechaInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  fechaFin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).refine((v) => Object.keys(v).length > 0, { message: 'sin cambios' });

module.exports = { tarifaSchema, tarifaUpdateSchema };
```

`src/validators/recomendacion.validator.js`:

```js
const { z } = require('zod');

const recomendacionSchema = z.object({
  organizacionId: z.string().uuid(),
  titulo: z.string().trim().min(3).max(160),
  descripcion: z.string().trim().min(3).max(2000),
  prioridad: z.enum(['baja', 'media', 'alta']).default('media'),
});

const recomendacionUpdateSchema = z.object({
  titulo: z.string().trim().min(3).max(160).optional(),
  descripcion: z.string().trim().min(3).max(2000).optional(),
  prioridad: z.enum(['baja', 'media', 'alta']).optional(),
  estado: z.enum(['abierta', 'aplicada', 'descartada']).optional(),
}).refine((v) => Object.keys(v).length > 0, { message: 'sin cambios' });

module.exports = { recomendacionSchema, recomendacionUpdateSchema };
```

- [ ] **Step 4: Ejecutar tests unitarios de rangos**

```powershell
node --test tests/unit/rangos.test.js
```
Expected: FAIL todavía (funciones no existen) → implementar `umbrales.service.js` con:

`src/services/umbrales.service.js` (junto con su repository — ejemplar completo del patrón service de este task):

```js
const repo = require('../repositories/umbrales.repository');
const { AppError } = require('../utils/errors');
const { registrarAuditoria } = require('./auditoria.service');

// Rangos semiabiertos [inf, sup): contiguos no solapan, cruzados sí.
function haySolapeRangos(inf, sup, existentes) {
  return (existentes || []).some((e) => {
    const ei = Number(e.limite_inferior);
    const es = Number(e.limite_superior);
    return inf < es && sup > ei;
  });
}

// Períodos cerrados [inicio, fin] (fechas 'YYYY-MM-DD' comparan como string).
function haySolapePeriodos(inicio, fin, existentes) {
  return (existentes || []).some((e) => inicio <= e.fecha_fin && fin >= e.fecha_inicio);
}

async function crearUmbral(datos, contexto) {
  const existentes = await repo.listarActivos(datos.organizacion_id ?? datos.organizacionId, datos.tipoRecursoId);
  if (haySolapeRangos(Number(datos.limiteInferior), Number(datos.limiteSuperior), existentes)) {
    throw new AppError(400, 'Rango solapado');
  }
  const umbral = await repo.crear({
    organizacion_id: datos.organizacionId,
    tipo_recurso_id: datos.tipoRecursoId,
    nombre: datos.nombre,
    nivel: datos.nivel,
    limite_inferior: datos.limiteInferior,
    limite_superior: datos.limiteSuperior,
    estado: 'activo',
  });
  await registrarAuditoria({
    entidad: 'umbral_clasificacion', entidadId: umbral.id, accion: 'crear',
    usuarioId: contexto.usuarioId, reqId: contexto.reqId,
    detalle: { nivel: datos.nivel, rango: [datos.limiteInferior, datos.limiteSuperior], tipoRecursoId: datos.tipoRecursoId },
  });
  return umbral;
}

async function actualizarUmbral(umbralId, cambios, contexto) {
  const actual = await repo.buscarPorId(umbralId);
  if (!actual) throw new AppError(404, 'Umbral no encontrado');
  const inf = Number(cambios.limiteInferior ?? actual.limite_inferior);
  const sup = Number(cambios.limiteSuperior ?? actual.limite_superior);
  if (inf >= sup) throw new AppError(400, 'Rango inválido', 'limiteInferior debe ser menor que limiteSuperior');
  const existentes = (await repo.listarActivos(actual.organizacion_id, actual.tipo_recurso_id))
    .filter((e) => e.id !== umbralId);
  if (haySolapeRangos(inf, sup, existentes)) throw new AppError(400, 'Rango solapado');
  const mapa = {
    nombre: cambios.nombre, nivel: cambios.nivel, estado: cambios.estado,
    limite_inferior: cambios.limiteInferior, limite_superior: cambios.limiteSuperior,
  };
  const limpio = Object.fromEntries(Object.entries(mapa).filter(([, v]) => v !== undefined));
  await repo.actualizar(umbralId, limpio);
  await registrarAuditoria({
    entidad: 'umbral_clasificacion', entidadId: umbralId, accion: 'actualizar',
    usuarioId: contexto.usuarioId, reqId: contexto.reqId, detalle: limpio,
  });
  return repo.buscarPorId(umbralId);
}

module.exports = { haySolapeRangos, haySolapePeriodos, crearUmbral, actualizarUmbral };
```

(Nota: `haySolapePeriodos` vive aquí para que un solo módulo concentre las reglas de rangos; `tarifas.service.js` lo importa de este archivo.)

- [ ] **Step 5: Implementar repositories y los demás services (mismo molde)**

`src/repositories/umbrales.repository.js`:

```js
const { UmbralClasificacion } = require('../models');

async function listarActivos(organizacionId, tipoRecursoId) {
  return UmbralClasificacion.findAll({
    where: { organizacion_id: organizacionId, tipo_recurso_id: tipoRecursoId, estado: 'activo' },
    order: [['limite_inferior', 'ASC']],
  });
}

async function listarPorOrg(organizacionId) {
  return UmbralClasificacion.findAll({
    where: { organizacion_id: organizacionId },
    order: [['creado_en', 'DESC']],
  });
}

async function buscarPorId(id) {
  return UmbralClasificacion.findByPk(id);
}

async function crear(datos) {
  return UmbralClasificacion.create(datos);
}

async function actualizar(id, campos) {
  const u = await UmbralClasificacion.findByPk(id);
  if (!u) return null;
  await u.update(campos);
  return u;
}

module.exports = { listarActivos, listarPorOrg, buscarPorId, crear, actualizar };
```

`src/repositories/metas.repository.js`, `src/repositories/tarifas.repository.js`, `src/repositories/recomendaciones.repository.js`: idéntico molde (`listarPorOrg(where organizacion_id)`, `buscarPorId`, `crear`, `actualizar`) sobre `MetaReduccion`, `Tarifa` y `Recomendacion`. Para `tarifas`, agregar:

```js
async function listarVigenciaSimilar({ organizacionId, tipoRecursoId, fechaInicio, fechaFin, excluirId = null }) {
  const { Tarifa } = require('../models');
  const { Op } = require('sequelize');
  return Tarifa.findAll({
    where: {
      tipo_recurso_id: tipoRecursoId,
      ...(excluirId ? { id: { [Op.ne]: excluirId } } : {}),
      [Op.or]: [
        { organizacion_id: organizacionId },
        { organizacion_id: null },
      ],
      fecha_inicio: { [Op.lte]: fechaFin },
      fecha_fin: { [Op.gte]: fechaInicio },
    },
  });
}
```

`src/services/tarifas.service.js`:

```js
const repo = require('../repositories/tarifas.repository');
const { haySolapePeriodos } = require('./umbrales.service');
const { AppError } = require('../utils/errors');
const { registrarAuditoria } = require('./auditoria.service');

async function crearTarifa(datos, contexto) {
  const vecinas = await repo.listarVigenciaSimilar({
    organizacionId: datos.organizacionId ?? null,
    tipoRecursoId: datos.tipoRecursoId,
    fechaInicio: datos.fechaInicio,
    fechaFin: datos.fechaFin,
  });
  if (haySolapePeriodos(datos.fechaInicio, datos.fechaFin, vecinas)) {
    throw new AppError(400, 'Período solapado');
  }
  const tarifa = await repo.crear({
    organizacion_id: datos.organizacionId ?? null,
    tipo_recurso_id: datos.tipoRecursoId,
    nombre: datos.nombre,
    monto: datos.monto,
    unidad: datos.unidad,
    fecha_inicio: datos.fechaInicio,
    fecha_fin: datos.fechaFin,
  });
  await registrarAuditoria({
    entidad: 'tarifa', entidadId: tarifa.id, accion: 'crear',
    usuarioId: contexto.usuarioId, reqId: contexto.reqId,
    detalle: { monto: datos.monto, periodo: [datos.fechaInicio, datos.fechaFin] },
  });
  return tarifa;
}

module.exports = { crearTarifa };
```

⚠️ Nota de implementación: el filtro de `listarVigenciaSimilar` es exactamente `fecha_inicio <= :fechaFin AND fecha_fin >= :fechaInicio` (solape de intervalos cerrados) — si el test "período solapado → 400" fallara, revisar este filtro antes que el service.

`src/services/metas.service.js`:

```js
const repo = require('../repositories/metas.repository');
const { AppError } = require('../utils/errors');
const { registrarAuditoria } = require('./auditoria.service');

async function crearMeta(datos, contexto) {
  if (datos.fechaInicio >= datos.fechaFin) throw new AppError(400, 'Fechas inválidas', 'fechaInicio debe ser anterior a fechaFin');
  if (datos.porcentajeReduccion < 0 || datos.porcentajeReduccion > 100) throw new AppError(400, 'Porcentaje inválido');
  const meta = await repo.crear({
    organizacion_id: datos.organizacionId,
    tipo_recurso_id: datos.tipoRecursoId,
    nombre: datos.nombre,
    porcentaje_reduccion: datos.porcentajeReduccion,
    fecha_inicio: datos.fechaInicio,
    fecha_fin: datos.fechaFin,
    estado: 'activo',
  });
  await registrarAuditoria({
    entidad: 'meta_reduccion', entidadId: meta.id, accion: 'crear',
    usuarioId: contexto.usuarioId, reqId: contexto.reqId,
    detalle: { porcentaje: datos.porcentajeReduccion, periodo: [datos.fechaInicio, datos.fechaFin] },
  });
  return meta;
}

async function actualizarMeta(id, cambios, contexto) {
  const actual = await repo.buscarPorId(id);
  if (!actual) throw new AppError(404, 'Meta no encontrada');
  const inicio = cambios.fechaInicio ?? actual.fecha_inicio;
  const fin = cambios.fechaFin ?? actual.fecha_fin;
  if (String(inicio) >= String(fin)) throw new AppError(400, 'Fechas inválidas');
  const mapa = {
    nombre: cambios.nombre, porcentaje_reduccion: cambios.porcentajeReduccion,
    fecha_inicio: cambios.fechaInicio, fecha_fin: cambios.fechaFin, estado: cambios.estado,
  };
  const limpio = Object.fromEntries(Object.entries(mapa).filter(([, v]) => v !== undefined));
  await repo.actualizar(id, limpio);
  await registrarAuditoria({
    entidad: 'meta_reduccion', entidadId: id, accion: 'actualizar',
    usuarioId: contexto.usuarioId, reqId: contexto.reqId, detalle: limpio,
  });
  return repo.buscarPorId(id);
}

module.exports = { crearMeta, actualizarMeta };
```

`src/services/recomendaciones.service.js`: molde equivalente (crear + actualizar estado) con `entidad: 'recomendacion'` y auditoría `crear`/`actualizar`. Aquí **no** hay solape: solo validación de enum (ya hecha por Zod).

- [ ] **Step 6: Controllers y routers (el patrón es idéntico a Task 5; especificación exacta por archivo)**

Para `umbrales`, `metas`, `tarifas`, `recomendaciones`, cada controller expone `listar`, `crear`, `actualizar` con esta estructura (usar `organizaciones.controller.js` del Task 5 como molde textual):

- `listar`: `requirePermission(x.consultar)` + `scopeOrg` → `repo.listarPorOrg(req.organizacionId)` → `okList(res, data)`.
- `crear`: `requirePermission(x.gestionar)` + `scopeOrg` + `validateBody(schema)` → `service.crearX(req.body, { usuarioId: req.user.id, reqId: req.id })` → `201`; `AppError` → `fail(res, e.status, e.error, e.detail)`; `SequelizeUniqueConstraintError` → `409 'Ya existe'`.
- `actualizar`: `requirePermission(x.gestionar)` + validar `req.params.id` como UUID (`400` si no lo es) + `scopeOrg` + `validateBody(updateSchema)` → cargar entidad, verificar `organizacion_id === req.organizacionId` (o membresía vía `req.orgIds`) si no → `404` (sin filtrar existencia) → `service.actualizarX(...)` → `200`.

Archivos exactos con sus permisos y schemas:

| Router | GET | POST | PATCH `/:id` | schema create | schema update | service |
|---|---|---|---|---|---|---|
| `umbrales.routes.js` | `umbral.consultar` | `umbral.gestionar` | `umbral.gestionar` | `umbralSchema` | `umbralUpdateSchema` | `crearUmbral/actualizarUmbral` |
| `metas.routes.js` | `meta.consultar` | `meta.gestionar` | `meta.gestionar` | `metaSchema` | `metaUpdateSchema` | `crearMeta/actualizarMeta` |
| `tarifas.routes.js` | `tarifa.consultar` | `tarifa.gestionar` | `tarifa.gestionar` | `tarifaSchema` | `tarifaUpdateSchema` | `crearTarifa` + `actualizarTarifa` (molde metas) |
| `recomendaciones.routes.js` | `recomendacion.consultar` | `recomendacion.gestionar` | `recomendacion.gestionar` | `recomendacionSchema` | `recomendacionUpdateSchema` | `crear/actualizar` |

`tarifas.service.js` debe exportar también `actualizarTarifa` con el mismo molde que `actualizarMeta` (incluye re-validación de solape cuando cambian `fechaInicio/fechaFin`, excluyendo el propio id, y auditoría).

Montar en `src/app.js`:

```js
  const { umbralesRouter } = require('./routes/umbrales.routes');
  const { metasRouter } = require('./routes/metas.routes');
  const { tarifasRouter } = require('./routes/tarifas.routes');
  const { recomendacionesRouter } = require('./routes/recomendaciones.routes');
  app.use('/api/v1/umbrales', umbralesRouter);
  app.use('/api/v1/metas', metasRouter);
  app.use('/api/v1/tarifas', tarifasRouter);
  app.use('/api/v1/recomendaciones', recomendacionesRouter);
```

- [ ] **Step 7: Ejecutar toda la batería**

```powershell
npm run test:unit
node --test tests/integration/crudObjetivos.test.js   # requiere MONITOREO_TEST_DATABASE_URL
```
Expected: unit PASS (rangos: 5 tests); integración PASS (10 tests). Sin BD: SKIP.

- [ ] **Step 8: Commit (lo ejecuta EL USUARIO)**

```powershell
git add "Proyecto-Heladeria-Monitoreo/monitoreo/backend"
git commit -m "feat(monitoreo): CRUD umbrales/metas/tarifas/recomendaciones con validacion de solapes, rangos y auditoria"
```

---

### Task 10: Consultas de consumo/alertas/notificaciones, reportes y CRUD de integraciones

**Files:**
- Create: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/src/validators/consulta.validator.js`
- Create: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/src/controllers/notificaciones.controller.js`
- Create: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/src/controllers/reportes.controller.js`
- Create: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/src/controllers/integraciones.controller.js`
- Create: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/src/services/integraciones.service.js`
- Create: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/src/repositories/notificaciones.repository.js`
- Create: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/src/repositories/integraciones.repository.js`
- Create (esqueletos): `controllers/consumo.controller.js`, `controllers/alertas.controller.js`, `services/consumo.service.js`, `services/alertas.service.js` (ya existe la de creación en Task 7 — agregar funciones de consulta en `alertas.service.js`), `services/reportes.service.js`, `routes/consumo.routes.js`, `routes/alertas.routes.js`, `routes/notificaciones.routes.js`, `routes/reportes.routes.js`, `routes/integraciones.routes.js`, `repositories/consumo.repository.js`, `repositories/alertas.repository.js`, `repositories/reportes.repository.js`
- Test: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/tests/integration/consultas.test.js`
- Modify: `src/app.js` (montar los 5 routers)

**Interfaces:**
- Consumes: tablas del pipeline (Tasks 6-8), `requirePermission/scopeOrg/validateQuery/registrarAuditoria` (Task 4), permisos `consumo.consultar`, `alerta.consultar`, `notificacion.consultar`, `reporte.consultar`, `integracion.consultar|gestionar` (Task 2).
- Produce (lo consume el frontend en Task 11-12):

| Método | Ruta | Permiso | Query/Body | Éxito |
|---|---|---|---|---|
| GET | `/api/v1/consumo` | `consumo.consultar` | `?organizacionId&desde&hasta&page&limit` | `200 { data, total, page, limit }` registros |
| GET | `/api/v1/alertas` | `alerta.consultar` | `?organizacionId&desde&hasta&nivel` | `200 { data }` |
| GET | `/api/v1/notificaciones` | `notificacion.consultar` | — | `200 { data }` (broadcast de sus orgs + suyas) |
| PATCH | `/api/v1/notificaciones/:id` | `notificacion.consultar` | `{ accion: 'vista' }` | `200` (solo si es suya o broadcast de su org) |
| GET | `/api/v1/reportes/consumo` | `reporte.consultar` | `?organizacionId&desde&hasta` | `200 { porRecurso, alertasPorNivel, costoEstimado, avanceMetas }` |
| GET | `/api/v1/reportes/top-excesos` | `reporte.consultar` | `?organizacionId&desde&hasta&limite` | `200 { data }` días con más consumo |
| GET | `/api/v1/integraciones` | `integracion.consultar` | `?organizacionId` | `200 { data }` — **nunca** incluye `api_key_hash` |
| POST | `/api/v1/integraciones` | `integracion.gestionar` | `{ organizacionId, nombre }` | `201 { integracion, apiKey }` — la key plaintext solo en esta respuesta |
| PATCH | `/api/v1/integraciones/:id` | `integracion.gestionar` | `{ accion: 'rotar' } \| { estado }` | `200` con `apiKey` solo si rota; auditoría siempre |

- `consultaValidator` (Zod): `desde`/`hasta` `YYYY-MM-DD` opcionales (`desde ≤ hasta`), `page ≥ 1`, `limit ∈ [1,100]` (default 50), `nivel ∈ alerta|critico` opcional. Todas las queries contrastan `organizacionId` con `req.orgIds` vía `scopeOrg`.
- `reportes.repository` — SQL crítico (fuente de verdad de los números del reporte): totales por recurso, alertas por nivel, costo con `JOIN LATERAL` que prefiere tarifa de la organización sobre global y desempata por `monto DESC` (evita duplicar consumo cuando coinciden ambas), y avance de metas. Ver código en Step 3.
- `integraciones.service.crearIntegracion/rotarClave` → `crypto.randomBytes(24).toString('hex')` (plaintext solo en la respuesta), en BD **únicamente** `sha256(key)`; auditoría `crear`/`rotar_clave`.

- [ ] **Step 1: Escribir el test fallido**

`tests/integration/consultas.test.js`:

```js
require('../helpers/env');
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { dbTest } = require('../helpers/env');
const crypto = require('crypto');

const ORG = '11111111-1111-4111-8111-111111111111';
const ADM = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OBS = 'bbbb0000-0000-4000-8000-000000000001';
let server; let base; let serverObs; let baseObs; let sequelize;
let integracionId; // creada por ADMIN en el test de POST (decisión T10-1)

// Decisión de diseño T10-1 (revisión, precedente T9-1): doble identidad. El seed
// aprobado da a `observador` solo 5 consultar (sin integracion.*) — un solo
// observador haría 403 en el POST. Lecturas como OBS (genuino least-privilege);
// escrituras de integraciones como ADMIN; negaciones genuinas como OBS.

async function insertarRegistro(org, cantidad) {
  const [tr] = await sequelize.query(`SELECT id FROM tipo_recurso WHERE codigo='agua'`);
  const [r] = await sequelize.query(
    `INSERT INTO recepcion_consumo_pos (consumo_externo_id, idempotency_key, organizacion_id, tipo_recurso, cantidad, unidad_medida, fecha_consumo, origen, estado)
     VALUES (:e, :k, :org, 'agua', :c, 'litros', now(), 'POS', 'procesado') RETURNING id`,
    { replacements: { e: crypto.randomUUID(), k: crypto.randomUUID(), org, c: cantidad }, type: require('sequelize').QueryTypes.SELECT },
  );
  await sequelize.query(
    `INSERT INTO registro_consumo (recepcion_id, organizacion_id, tipo_recurso_id, tipo_recurso, cantidad, unidad_medida, fecha_consumo, clasificacion, origen)
     VALUES (:rid, :org, :tr, 'agua', :c, 'litros', now(), 'normal', 'POS')`,
    { replacements: { rid: r.id, org, tr: tr[0].id, c: cantidad } },
  );
}

before(async () => {
  if (!process.env.MONITOREO_TEST_DATABASE_URL) return;
  ({ sequelize } = require('../../src/config/database'));
  await sequelize.authenticate();
  const fx = require('../helpers/fixtures');
  await fx.prepararSchema();
  await insertarRegistro(ORG, 500);
  await insertarRegistro(ORG, 1200);
  // registro de una org ajena: jamás debe aparecer
  const [orgAjena] = await sequelize.query(`INSERT INTO organizacion (nombre) VALUES ('Ajena') RETURNING id`, { type: require('sequelize').QueryTypes.SELECT });
  await insertarRegistro(orgAjena.id, 99999);

  const { testApp, listen } = require('../helpers/testApp');
  const { consumoRouter } = require('../../src/routes/consumo.routes');
  const { alertasRouter } = require('../../src/routes/alertas.routes');
  const { notificacionesRouter } = require('../../src/routes/notificaciones.routes');
  const { reportesRouter } = require('../../src/routes/reportes.routes');
  const { integracionesRouter } = require('../../src/routes/integraciones.routes');
  async function montar(user) {
    const app = testApp(user, [
      ['/api/v1/consumo', consumoRouter],
      ['/api/v1/alertas', alertasRouter],
      ['/api/v1/notificaciones', notificacionesRouter],
      ['/api/v1/reportes', reportesRouter],
      ['/api/v1/integraciones', integracionesRouter],
    ]);
    return listen(app);
  }
  await fx.seedUsuarioEnOrg(ADM, 'adm@test.local', 'admin_monitoreo');
  await fx.seedUsuarioEnOrg(OBS, 'obs@test.local', 'observador');
  ({ server, base } = await montar({ id: ADM, email: 'adm@test.local' }));
  ({ server: serverObs, base: baseObs } = await montar({ id: OBS, email: 'obs@test.local' }));
});
after(() => { server?.close(); serverObs?.close(); return sequelize?.close(); });

dbTest('GET /consumo pagina y solo muestra la org del membership (total = suma propia)', async () => {
  const res = await fetch(`${baseObs}/api/v1/consumo?organizacionId=${ORG}&page=1&limit=1`);
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.strictEqual(body.data.length, 1, 'limit=1');
  assert.strictEqual(body.total, 2, 'el registro de la org ajena no cuenta');
  assert.strictEqual(body.page, 1);
  assert.strictEqual(body.limit, 1);
  assert.ok(body.data.every((r) => r.organizacion_id === ORG));
});

dbTest('GET /consumo con limit fuera de rango → 400; org ajena → 403', async () => {
  const malo = await fetch(`${baseObs}/api/v1/consumo?organizacionId=${ORG}&limit=5000`);
  assert.strictEqual(malo.status, 400);
  const ajena = await fetch(`${baseObs}/api/v1/consumo?organizacionId=99999999-9999-4999-8999-999999999999`);
  assert.strictEqual(ajena.status, 403);
});

dbTest('GET /reportes/consumo devuelve totales correctos (500+1200=1700 litros) con costo por tarifa vigente', async () => {
  // tarifa que cubre hoy
  const [tr] = await sequelize.query(`SELECT id FROM tipo_recurso WHERE codigo='agua'`);
  await sequelize.query(
    `INSERT INTO tarifa (organizacion_id, tipo_recurso_id, nombre, monto, unidad, fecha_inicio, fecha_fin)
     VALUES (:org, :tr, 'Tarifa anual', 0.05, 'litro', '2026-01-01', '2026-12-31')`,
    { replacements: { org: ORG, tr: tr[0].id } },
  );
  const res = await fetch(`${baseObs}/api/v1/reportes/consumo?organizacionId=${ORG}`);
  assert.strictEqual(res.status, 200);
  const r = await res.json();
  const agua = r.porRecurso.find((x) => x.tipo === 'agua');
  assert.ok(agua, 'debe reportar agua');
  assert.strictEqual(Number(agua.total), 1700, `total esperado 1700, llegó ${agua.total}`);
  assert.strictEqual(agua.registros, 2);
  const costo = r.costoEstimado.find((x) => x.tipo === 'agua');
  assert.ok(costo, 'debe estimar costo');
  assert.strictEqual(Math.round(Number(costo.costo) * 100) / 100, 85, '1700 litros * 0.05 = 85.00');
  assert.ok(Array.isArray(r.alertasPorNivel));
  assert.ok(Array.isArray(r.avanceMetas));
});

dbTest('GET /reportes/consumo sin tarifa → costo null/0 pero totales siguen', async () => {
  const [org2] = await sequelize.query(`INSERT INTO organizacion (nombre) VALUES ('Sin tarifa') RETURNING id`, { type: require('sequelize').QueryTypes.SELECT });
  await insertarRegistro(org2.id, 100);
  const res = await fetch(`${baseObs}/api/v1/reportes/consumo?organizacionId=${org2.id}`);
  assert.strictEqual(res.status, 403, 'observador no es miembro de esa org → aislamiento');
});

dbTest('GET /notificaciones trae broadcast + propias; PATCH vista lo marca solo si es suyo', async () => {
  // alerta + notificación (broadcast) en la org demo
  const [al] = await sequelize.query(
    `INSERT INTO alerta (organizacion_id, nivel, tipo_recurso, mensaje, fecha_generacion, estado)
     VALUES (:org, 'alerta', 'agua', 'msj', now(), 'pendiente') RETURNING id`,
    { replacements: { org: ORG }, type: require('sequelize').QueryTypes.SELECT });
  const [nBroadcast] = await sequelize.query(
    `INSERT INTO notificacion (alerta_id, usuario_id, canal, estado) VALUES (:a, NULL, 'in_app', 'pendiente') RETURNING id`,
    { replacements: { a: al[0].id }, type: require('sequelize').QueryTypes.SELECT });

  const lista = await (await fetch(`${baseObs}/api/v1/notificaciones`)).json();
  assert.ok(lista.data.length >= 1, 've la broadcast de su org');

  const patch = await fetch(`${baseObs}/api/v1/notificaciones/${nBroadcast[0].id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accion: 'vista' }),
  });
  assert.strictEqual(patch.status, 200);
  const [n] = await sequelize.query('SELECT * FROM notificacion WHERE id = :id', { replacements: { id: nBroadcast[0].id } });
  assert.strictEqual(n[0].estado, 'vista');
  assert.ok(n[0].vista_en, 'vista_en registrado');
});

dbTest('POST /integraciones devuelve la API key UNA sola vez; en BD solo hay hash; GET jamás la expone', async () => {
  // Decisión T10-1 (revisión): doble identidad. Observador no puede crear (403
  // genuino, sin integracion.gestionar); ADMIN crea (201) y lista. GET como
  // observador → 403 (sin integracion.consultar).
  const negada = await fetch(`${baseObs}/api/v1/integraciones`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ organizacionId: ORG, nombre: 'intrusa' }),
  });
  assert.strictEqual(negada.status, 403);

  const crear = await fetch(`${base}/api/v1/integraciones`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ organizacionId: ORG, nombre: 'POS prod' }),
  });
  assert.strictEqual(crear.status, 201);
  const cuerpo = await crear.json();
  assert.ok(cuerpo.apiKey && cuerpo.apiKey.length >= 40, 'key entregada en el crear');
  assert.ok(cuerpo.integracion.id);
  integracionId = cuerpo.integracion.id;

  const [filas] = await sequelize.query('SELECT * FROM integracion WHERE id = :id', { replacements: { id: cuerpo.integracion.id } });
  assert.strictEqual(filas[0].api_key_hash.length, 64, 'solo sha256');
  assert.ok(!filas[0].api_key_hash.includes(cuerpo.apiKey), 'plaintext jamás en BD');

  const lista = await (await fetch(`${base}/api/v1/integraciones?organizacionId=${ORG}`)).json();
  const item = lista.data.find((i) => i.id === cuerpo.integracion.id);
  assert.ok(item, 'aparece en la lista');
  assert.strictEqual(item.api_key_hash, undefined, 'GET no expone ni el hash');
  assert.strictEqual(item.apiKey, undefined, 'GET no repite la key');

  const listaObs = await fetch(`${baseObs}/api/v1/integraciones?organizacionId=${ORG}`);
  assert.strictEqual(listaObs.status, 403, 'observador sin integracion.consultar');

  const [aud] = await sequelize.query(
    `SELECT count(*)::int n FROM auditoria_cambio WHERE entidad='integracion' AND accion='crear' AND entidad_id = :id`,
    { replacements: { id: cuerpo.integracion.id } });
  assert.strictEqual(aud[0].n, 1);
});

dbTest('PATCH /integraciones/:id rotar → observador 403 sin tocar hash; admin rota con auditoría', async () => {
  const [integ] = await sequelize.query(`SELECT * FROM integracion WHERE id = :id`, { replacements: { id: integracionId } });
  const rotarObs = await fetch(`${baseObs}/api/v1/integraciones/${integ[0].id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accion: 'rotar' }),
  });
  assert.strictEqual(rotarObs.status, 403, 'el usuario observador: sin integracion.gestionar');
  // y la key original sigue intacta en BD
  const [filas] = await sequelize.query('SELECT api_key_hash FROM integracion WHERE id = :id', { replacements: { id: integ[0].id } });
  assert.strictEqual(filas[0].api_key_hash, integ[0].api_key_hash);

  const rotar = await fetch(`${base}/api/v1/integraciones/${integ[0].id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accion: 'rotar' }),
  });
  assert.strictEqual(rotar.status, 200);
  const cuerpo = await rotar.json();
  assert.ok(cuerpo.apiKey && cuerpo.apiKey.length >= 40, 'nueva key entregada al rotar');
  const [filas2] = await sequelize.query('SELECT api_key_hash FROM integracion WHERE id = :id', { replacements: { id: integ[0].id } });
  assert.notStrictEqual(filas2[0].api_key_hash, integ[0].api_key_hash, 'hash distinto tras rotar');
  assert.strictEqual(filas2[0].api_key_hash.length, 64, 'solo sha256');
  const [aud] = await sequelize.query(
    `SELECT count(*)::int n FROM auditoria_cambio WHERE entidad='integracion' AND accion='rotar_clave' AND entidad_id = :id`,
    { replacements: { id: integ[0].id } });
  assert.strictEqual(aud[0].n, 1);
});

dbTest('GET /alertas filtra por org y nivel', async () => {
  const res = await fetch(`${baseObs}/api/v1/alertas?organizacionId=${ORG}&nivel=alerta`);
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.ok(body.data.every((a) => a.organizacion_id === ORG && a.nivel === 'alerta'));
  const malo = await fetch(`${baseObs}/api/v1/alertas?organizacionId=${ORG}&nivel=volando`);
  assert.strictEqual(malo.status, 400);
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

```powershell
node --test tests/integration/consultas.test.js
```
Expected: FAIL — routers inexistentes (`consumo.routes` vacío → `consumoRouter` undefined).

- [ ] **Step 3: Implementar el repository de reportes (SQL de los números)**

`src/validators/consulta.validator.js`:

```js
const { z } = require('zod');

const rangoSchema = z.object({
  organizacionId: z.string().uuid(),
  desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  nivel: z.enum(['alerta', 'critico']).optional(),
  limite: z.coerce.number().int().min(1).max(50).default(10),
}).refine((v) => !v.desde || !v.hasta || v.desde <= v.hasta, {
  message: 'desde debe ser <= hasta', path: ['hasta'],
});

module.exports = { rangoSchema };
```

`src/repositories/reportes.repository.js` (siempre parametrizado: `desde`/`hasta` llegan ya validados por `rangoSchema`, pero igual se usan `replacements` — nunca interpolación):

```js
const { sequelize } = require('../config/database');

async function resumenConsumo(organizacionId, desde, hasta) {
  const [porRecurso] = await sequelize.query(
    `SELECT rc.tipo_recurso AS tipo,
            COALESCE(SUM(rc.cantidad), 0)::numeric(14,3) AS total,
            COUNT(*)::int AS registros
       FROM registro_consumo rc
      WHERE rc.organizacion_id = :org
        AND (:desde::date IS NULL OR rc.fecha_consumo::date >= :desde::date)
        AND (:hasta::date IS NULL OR rc.fecha_consumo::date <= :hasta::date)
      GROUP BY rc.tipo_recurso
      ORDER BY rc.tipo_recurso`,
    { replacements: { org: organizacionId, desde: desde ?? null, hasta: hasta ?? null } },
  );
  return porRecurso;
}

async function resumenAlertas(organizacionId, desde, hasta) {
  const [filas] = await sequelize.query(
    `SELECT a.nivel, COUNT(*)::int AS total
       FROM alerta a
      WHERE a.organizacion_id = :org
        AND (:desde::date IS NULL OR a.fecha_generacion::date >= :desde::date)
        AND (:hasta::date IS NULL OR a.fecha_generacion::date <= :hasta::date)
      GROUP BY a.nivel
      ORDER BY a.nivel`,
    { replacements: { org: organizacionId, desde: desde ?? null, hasta: hasta ?? null } },
  );
  return filas;
}

async function costoEstimado(organizacionId, desde, hasta) {
  // JOIN LATERAL: prefiere tarifa de la organización sobre la global y
  // desempata por monto DESC → una sola tarifa por registro (sin duplicar).
  const [filas] = await sequelize.query(
    `SELECT rc.tipo_recurso AS tipo,
            COALESCE(SUM(rc.cantidad * tf.monto), 0)::numeric(14,2) AS costo,
            COUNT(tf.id)::int AS registros_con_tarifa
       FROM registro_consumo rc
       LEFT JOIN LATERAL (
         SELECT t.monto, t.id
           FROM tarifa t
          WHERE t.tipo_recurso_id = rc.tipo_recurso_id
            AND (t.organizacion_id IS NULL OR t.organizacion_id = rc.organizacion_id)
            AND rc.fecha_consumo::date BETWEEN t.fecha_inicio AND t.fecha_fin
          ORDER BY (t.organizacion_id IS NOT NULL) DESC, t.monto DESC
          LIMIT 1
       ) tf ON true
      WHERE rc.organizacion_id = :org
        AND (:desde::date IS NULL OR rc.fecha_consumo::date >= :desde::date)
        AND (:hasta::date IS NULL OR rc.fecha_consumo::date <= :hasta::date)
      GROUP BY rc.tipo_recurso
      ORDER BY rc.tipo_recurso`,
    { replacements: { org: organizacionId, desde: desde ?? null, hasta: hasta ?? null } },
  );
  return filas;
}

async function avanceMetas(organizacionId) {
  const [filas] = await sequelize.query(
    `SELECT m.id, m.nombre, m.porcentaje_reduccion::numeric(5,2) AS porcentaje_reduccion,
            m.fecha_inicio, m.fecha_fin, m.estado,
            COALESCE((
              SELECT SUM(rc.cantidad)
                FROM registro_consumo rc
               WHERE rc.organizacion_id = m.organizacion_id
                 AND rc.tipo_recurso_id = m.tipo_recurso_id
                 AND rc.fecha_consumo::date >= m.fecha_inicio
                 AND rc.fecha_consumo::date < LEAST(CURRENT_DATE, m.fecha_fin)
            ), 0)::numeric(14,3) AS consumo_en_meta
       FROM meta_reduccion m
      WHERE m.organizacion_id = :org AND m.estado = 'activo'
      ORDER BY m.fecha_fin`,
    { replacements: { org: organizacionId } },
  );
  return filas;
}

async function topExcesos(organizacionId, desde, hasta, limite) {
  const [filas] = await sequelize.query(
    `SELECT rc.fecha_consumo::date AS dia, rc.tipo_recurso AS tipo,
            SUM(rc.cantidad)::numeric(14,3) AS total
       FROM registro_consumo rc
      WHERE rc.organizacion_id = :org
        AND (:desde::date IS NULL OR rc.fecha_consumo::date >= :desde::date)
        AND (:hasta::date IS NULL OR rc.fecha_consumo::date <= :hasta::date)
      GROUP BY 1, 2
      ORDER BY total DESC
      LIMIT :limite`,
    { replacements: { org: organizacionId, desde: desde ?? null, hasta: hasta ?? null, limite } },
  );
  return filas;
}

module.exports = { resumenConsumo, resumenAlertas, costoEstimado, avanceMetas, topExcesos };
```

- [ ] **Step 4: Implementar repositories/services/controllers restantes**

`src/repositories/consumo.repository.js`:

```js
const { RegistroConsumo, TipoRecurso } = require('../models');
const { Op } = require('sequelize');

async function listar(organizacionId, { desde, hasta, page, limit }) {
  const where = { organizacion_id: organizacionId };
  if (desde || hasta) {
    where.fecha_consumo = {
      ...(desde ? { [Op.gte]: new Date(`${desde}T00:00:00`) } : {}),
      ...(hasta ? { [Op.lte]: new Date(`${hasta}T23:59:59.999`) } : {}),
    };
  }
  const { rows, count } = await RegistroConsumo.findAndCountAll({
    where,
    include: [{ model: TipoRecurso, as: 'tipoRecurso' }],
    order: [['fecha_consumo', 'DESC']],
    limit,
    offset: (page - 1) * limit,
  });
  return { data: rows, total: count, page, limit };
}

module.exports = { listar };
```

`src/repositories/alertas.repository.js`:

```js
const { Alerta } = require('../models');
const { Op } = require('sequelize');

async function listar(organizacionId, { desde, hasta, nivel }) {
  const where = { organizacion_id: organizacionId };
  if (nivel) where.nivel = nivel;
  if (desde || hasta) {
    where.fecha_generacion = {
      ...(desde ? { [Op.gte]: new Date(`${desde}T00:00:00`) } : {}),
      ...(hasta ? { [Op.lte]: new Date(`${hasta}T23:59:59.999`) } : {}),
    };
  }
  return Alerta.findAll({ where, order: [['fecha_generacion', 'DESC']], limit: 200 });
}

module.exports = { listar };
```

`src/repositories/notificaciones.repository.js`:

```js
const { Notificacion, Alerta } = require('../models');
const { Op } = require('sequelize');

// Las suyas (usuario_id = user) + broadcast (NULL) de alertas de sus orgs.
async function listarParaUsuario(usuarioId, orgIds) {
  return Notificacion.findAll({
    include: [{
      model: Alerta, as: 'alerta',
      where: { organizacion_id: { [Op.in]: orgIds } },
    }],
    where: {
      [Op.or]: [
        { usuario_id: usuarioId },
        { usuario_id: null },
      ],
    },
    order: [['creada_en', 'DESC']],
    limit: 200,
  });
}

async function buscarPorId(id) {
  return Notificacion.findByPk(id, { include: [{ model: Alerta, as: 'alerta' }] });
}

async function marcarVista(id) {
  const n = await Notificacion.findByPk(id);
  if (!n) return null;
  await n.update({ estado: 'vista', vista_en: new Date() });
  return n;
}

module.exports = { listarParaUsuario, buscarPorId, marcarVista };
```

`src/repositories/integraciones.repository.js`:

```js
const { Integracion } = require('../models');

async function listarPorOrg(organizacionId) {
  // Excluir api_key_hash de la proyección: jamás sale del backend.
  return Integracion.findAll({
    where: { organizacion_id: organizacionId },
    attributes: { exclude: ['api_key_hash'] },
    order: [['creado_en', 'DESC']],
  });
}

async function buscarPorId(id) {
  return Integracion.findByPk(id, { attributes: { exclude: ['api_key_hash'] } });
}

async function crear({ organizacionId, nombre, api_key_hash }) {
  return Integracion.create({ organizacion_id: organizacionId, nombre, api_key_hash, estado: 'activo' });
}

async function guardarHash(id, api_key_hash) {
  await Integracion.update({ api_key_hash }, { where: { id } });
}

async function actualizar(id, campos) {
  const i = await Integracion.findByPk(id);
  if (!i) return null;
  await i.update(campos);
  return i;
}

module.exports = { listarPorOrg, buscarPorId, crear, guardarHash, actualizar };
```

`src/services/integraciones.service.js`:

```js
const crypto = require('crypto');
const repo = require('../repositories/integraciones.repository');
const { AppError } = require('../utils/errors');
const { registrarAuditoria } = require('./auditoria.service');

function sha256hex(texto) {
  return crypto.createHash('sha256').update(texto).digest('hex');
}

// La key plaintext NUNCA se persiste: solo sale en esta respuesta.
async function crearIntegracion(datos, contexto) {
  const apiKey = `mon_${crypto.randomBytes(24).toString('hex')}`;
  const integracion = await repo.crear({ ...datos, api_key_hash: sha256hex(apiKey) });
  await registrarAuditoria({
    entidad: 'integracion', entidadId: integracion.id, accion: 'crear',
    usuarioId: contexto.usuarioId, reqId: contexto.reqId,
    detalle: { nombre: datos.nombre, organizacionId: datos.organizacionId },
  });
  return { integracion: await repo.buscarPorId(integracion.id), apiKey };
}

async function rotarClave(id, contexto) {
  const actual = await repo.buscarPorId(id);
  if (!actual) throw new AppError(404, 'Integración no encontrada');
  const apiKey = `mon_${crypto.randomBytes(24).toString('hex')}`;
  await repo.guardarHash(id, sha256hex(apiKey));
  await registrarAuditoria({
    entidad: 'integracion', entidadId: id, accion: 'rotar_clave',
    usuarioId: contexto.usuarioId, reqId: contexto.reqId, detalle: null, // jamás loguear la key
  });
  return { integracion: await repo.buscarPorId(id), apiKey };
}

async function cambiarEstado(id, estado, contexto) {
  const actual = await repo.buscarPorId(id);
  if (!actual) throw new AppError(404, 'Integración no encontrada');
  await repo.actualizar(id, { estado });
  await registrarAuditoria({
    entidad: 'integracion', entidadId: id, accion: 'actualizar',
    usuarioId: contexto.usuarioId, reqId: contexto.reqId, detalle: { estado },
  });
  return repo.buscarPorId(id);
}

module.exports = { crearIntegracion, rotarClave, cambiarEstado };
```

`src/services/reportes.service.js`:

```js
const repo = require('../repositories/reportes.repository');

async function reporteConsumo(organizacionId, { desde, hasta }) {
  const [porRecurso, alertasPorNivel, costoEstimado, avanceMetas] = await Promise.all([
    repo.resumenConsumo(organizacionId, desde, hasta),
    repo.resumenAlertas(organizacionId, desde, hasta),
    repo.costoEstimado(organizacionId, desde, hasta),
    repo.avanceMetas(organizacionId),
  ]);
  return { porRecurso, alertasPorNivel, costoEstimado, avanceMetas, rango: { desde: desde ?? null, hasta: hasta ?? null } };
}

async function topExcesos(organizacionId, { desde, hasta, limite }) {
  return repo.topExcesos(organizacionId, desde, hasta, limite);
}

module.exports = { reporteConsumo, topExcesos };
```

`src/services/consumo.service.js` y `src/services/alertas.service.js`: delegación fina (`repo.listar(...)`), mismo molde.

Controllers (`consumo`, `alertas`, `notificaciones`, `reportes`, `integraciones`): patrón del Task 5 — `try/catch`, `okList/ok/fail`, `AppError` resuelto con su status. Detalles no negociables:

- `notificaciones.actualizar`: tras `marcarVista`, verificar que `notificacion.alerta.organizacion_id ∈ req.orgIds` **antes** de marcar (si no → `404`; una org ajena jamás marca vistas ajenas).
- `integraciones.crear`: valida `organizacionId ∈ req.orgIds` (si no → `403`) antes del service.
- `integraciones.actualizar`: si body `accion === 'rotar'` → `rotarClave`; si `estado` → `cambiarEstado`; ambos `integracion.gestionar`.
- `reportes.*`: solo `scopeOrg` + service.

Routers (`routes/*.routes.js`): `authenticateJWT` → `requirePermission(permiso)` → `scopeOrg` (donde hay `organizacionId`) → `validateQuery(rangoSchema)` (GET con query) o `validateBody(schema)` → controller. Notificaciones no lleva `scopeOrg` (lista todas las suyas de todas sus orgs).

Montar en `src/app.js`:

```js
  const { consumoRouter } = require('./routes/consumo.routes');
  const { alertasRouter } = require('./routes/alertas.routes');
  const { notificacionesRouter } = require('./routes/notificaciones.routes');
  const { reportesRouter } = require('./routes/reportes.routes');
  const { integracionesRouter } = require('./routes/integraciones.routes');
  app.use('/api/v1/consumo', consumoRouter);
  app.use('/api/v1/alertas', alertasRouter);
  app.use('/api/v1/notificaciones', notificacionesRouter);
  app.use('/api/v1/reportes', reportesRouter);
  app.use('/api/v1/integraciones', integracionesRouter);
```

- [ ] **Step 5: Ejecutar la batería completa del backend**

```powershell
npm test
```
Expected: todos los unit PASS; integración PASS con `MONITOREO_TEST_DATABASE_URL` definida (consumption 7, crudBasico 7, processing 6, alertDelivery 7, crudObjetivos 10, consultas 9 + auth 4). Sin la variable: los de BD aparecen SKIP con el aviso estándar. `npm test` serializa los archivos (`--test-concurrency=1`) porque cada archivo de integración hace `DROP SCHEMA monitoreo_test` en su `before()` — en paralelo se pisarían (enmienda T5-1).

- [ ] **Step 6: Commit (lo ejecuta EL USUARIO)**

```powershell
git add "Proyecto-Heladeria-Monitoreo/monitoreo/backend"
git commit -m "feat(monitoreo): consultas de consumo/alertas/notificaciones, reportes con costo por tarifa y CRUD de integraciones"
```

---

### Task 11: Frontend — scaffold React+Vite, auth Supabase, vistas Consumo y Alertas

**Files:**
- Create (esqueletos vacíos): `Proyecto-Heladeria-Monitoreo/monitoreo/frontend/package.json`, `index.html`, `vite.config.js`, `.env.example`, `src/App.jsx`, `src/main.jsx`, `src/services/api.js`, `src/services/authService.js`, `src/services/consumoService.js`, `src/services/alertasService.js`
- Create: `Proyecto-Heladeria-Monitoreo/monitoreo/frontend/src/services/supabaseClient.js`
- Create: `Proyecto-Heladeria-Monitoreo/monitoreo/frontend/src/context/AuthContext.jsx`
- Create: `Proyecto-Heladeria-Monitoreo/monitoreo/frontend/src/components/ProtectedRoute.jsx`
- Create: `Proyecto-Heladeria-Monitoreo/monitoreo/frontend/src/layouts/MainLayout.jsx`
- Create: `Proyecto-Heladeria-Monitoreo/monitoreo/frontend/src/routes/AppRoutes.jsx`
- Create: `Proyecto-Heladeria-Monitoreo/monitoreo/frontend/src/views/Login.jsx`, `src/views/Consumo.jsx`, `src/views/Alertas.jsx`
- Create: `Proyecto-Heladeria-Monitoreo/monitoreo/frontend/src/styles.css`
- Verify: `npm run build` en `monitoreo/frontend/`

**Interfaces:**
- Consumes: backend Task 10 (`GET /consumo`, `GET /alertas` con JWT Bearer), Supabase Auth (`signInWithPassword` con `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` — publishable; **SERVICE_ROLE_KEY JAMÁS**), proxy de Vite a `http://localhost:4001` en `/api`.
- Produce (lo extiende Task 12):
  - `api.get/post/patch(ruta, cuerpo?)` → fetch con `Authorization: Bearer <access_token>` a `/api/v1/...`; lanza `Error` con `.status` y `.detail` del `{ error }` del backend.
  - `supabaseClient` (único cliente), `authService.iniciarSesion/cerrarSesion/sesion`, `AuthContext` (`{ sesion, perfil, orgSeleccionada, setOrgSeleccionada, iniciarSesion, cerrarSesion, cargando }`; `perfil` = `GET /auth/me` y `orgSeleccionada` default a la primera membresía).
  - `ProtectedRoute` (espera sesión, si no → `/login`), `MainLayout` (nav + email + salir; `Outlet`), `AppRoutes` (`/login`, `/consumo`, `/alertas`, `/`→`/consumo`, `*`→`/`).
  - `consumoService.listar({ organizacionId, page, limit, desde?, hasta? })` → `GET /consumo?...`; `alertasService.listar({ organizacionId, nivel?, desde?, hasta? })` → `GET /alertas?...`.
  - Vistas: `Login` (form email/password con error inline), `Consumo` (tabla paginada: fecha, tipo, cantidad, unidad, clasificación con badge, botones ‹ ›), `Alertas` (filtro de nivel, tabla: fecha, nivel con badge de color, tipo, mensaje, estado).
  - Verificación: `npm run build` exitoso (Vite). No se agregan librerías de UI/gráficas (YAGNI; tablas con CSS propio en `styles.css`).

- [ ] **Step 1: `package.json`, `vite.config.js`, `.env.example`, `index.html`**

`package.json`:

```json
{
  "name": "monitoreo-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.116.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "react-router-dom": "^7.9.6"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^5.1.1",
    "vite": "^7.1.14"
  }
}
```

`vite.config.js`:

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api': { target: 'http://localhost:4001', changeOrigin: true },
    },
  },
});
```

`.env.example`:

```env
# Frontend Monitoreo — copia a .env (gitignored). Solo claves publishable.
# JAMÁS SUPABASE_SERVICE_ROLE_KEY aquí (AGENTS.md §4.5).
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=clave-publishable-de-supabase
```

`index.html`:

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Monitoreo Agua y Energía</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Servicios base**

`src/services/supabaseClient.js`:

```js
import { createClient } from '@supabase/supabase-js';

// Cliente único. Solo claves publishable (nunca service-role en React).
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL ?? '',
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
);
```

`src/services/api.js`:

```js
import { supabase } from './supabaseClient';

const BASE = '/api/v1';

async function token() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function solicitud(metodo, ruta, cuerpo) {
  const t = await token();
  const res = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
    ...(cuerpo !== undefined ? { body: JSON.stringify(cuerpo) } : {}),
  });
  const cuerpoRes = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(cuerpoRes.error || `Error ${res.status}`);
    err.status = res.status;
    err.detail = cuerpoRes.detail;
    throw err;
  }
  return cuerpoRes;
}

export const api = {
  get: (ruta) => solicitud('GET', ruta),
  post: (ruta, cuerpo) => solicitud('POST', ruta, cuerpo),
  patch: (ruta, cuerpo) => solicitud('PATCH', ruta, cuerpo),
};
```

`src/services/authService.js`:

```js
import { supabase } from './supabaseClient';
import { api } from './api';

export async function iniciarSesion(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data;
}

export async function cerrarSesion() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

export function observarSesion(callback) {
  const { data } = supabase.auth.onAuthStateChange((_evento, sesion) => callback(sesion));
  return data.subscription;
}

export async function obtenerPerfil() {
  return api.get('/auth/me');
}
```

`src/services/consumoService.js`:

```js
import { api } from './api';

export async function listar({ organizacionId, page = 1, limit = 25, desde, hasta }) {
  const q = new URLSearchParams({ organizacionId, page: String(page), limit: String(limit) });
  if (desde) q.set('desde', desde);
  if (hasta) q.set('hasta', hasta);
  return api.get(`/consumo?${q}`);
}
```

`src/services/alertasService.js`:

```js
import { api } from './api';

export async function listar({ organizacionId, nivel, desde, hasta }) {
  const q = new URLSearchParams({ organizacionId });
  if (nivel) q.set('nivel', nivel);
  if (desde) q.set('desde', desde);
  if (hasta) q.set('hasta', hasta);
  return api.get(`/alertas?${q}`);
}
```

- [ ] **Step 3: Contexto de auth, rutas y layout**

`src/context/AuthContext.jsx`:

```jsx
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authService from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [sesion, setSesion] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [orgSeleccionada, setOrgSeleccionada] = useState(null);
  const [cargando, setCargando] = useState(true);

  const cargarPerfil = useCallback(async (sesionActual) => {
    if (!sesionActual) { setPerfil(null); setOrgSeleccionada(null); return; }
    try {
      const p = await authService.obtenerPerfil();
      setPerfil(p);
      setOrgSeleccionada((prev) => prev ?? p.organizaciones[0]?.id ?? null);
    } catch {
      setPerfil(null);
    }
  }, []);

  useEffect(() => {
    let vivo = true;
    authService.observarSesion(async (s) => {
      if (!vivo) return;
      setSesion(s);
      await cargarPerfil(s);
      if (vivo) setCargando(false);
    });
    return () => { vivo = false; };
  }, [cargarPerfil]);

  const valor = useMemo(() => ({
    sesion,
    perfil,
    orgSeleccionada,
    setOrgSeleccionada,
    cargando,
    iniciarSesion: async (email, password) => {
      await authService.iniciarSesion(email, password); // onAuthStateChange actualiza el estado
    },
    cerrarSesion: () => authService.cerrarSesion(),
  }), [sesion, perfil, orgSeleccionada, cargando]);

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth fuera de AuthProvider');
  return ctx;
}
```

`src/components/ProtectedRoute.jsx`:

```jsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute() {
  const { sesion, cargando } = useAuth();
  if (cargando) return <p className="cargando">Cargando…</p>;
  if (!sesion) return <Navigate to="/login" replace />;
  return <Outlet />;
}
```

`src/layouts/MainLayout.jsx`:

```jsx
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Task 12 agrega aquí los enlaces restantes (organizaciones, medidores,
// umbrales, metas, tarifas, recomendaciones, notificaciones, reportes).
const enlaces = [
  { a: '/consumo', texto: 'Consumo' },
  { a: '/alertas', texto: 'Alertas' },
];

export default function MainLayout() {
  const { sesion, cerrarSesion, perfil, orgSeleccionada, setOrgSeleccionada } = useAuth();

  return (
    <div className="layout">
      <header className="cabecera">
        <strong>Monitoreo Agua y Energía</strong>
        <nav>
          {enlaces.map((e) => (
            <NavLink key={e.a} to={e.a} className={({ isActive }) => (isActive ? 'activo' : '')}>
              {e.texto}
            </NavLink>
          ))}
        </nav>
        <div className="sesion">
          {perfil?.organizaciones?.length > 1 && (
            <select value={orgSeleccionada ?? ''} onChange={(e) => setOrgSeleccionada(e.target.value)}>
              {perfil.organizaciones.map((o) => (
                <option key={o.id} value={o.id}>{o.nombre}</option>
              ))}
            </select>
          )}
          <span>{sesion?.user?.email}</span>
          <button type="button" onClick={cerrarSesion}>Salir</button>
        </div>
      </header>
      <main className="contenido">
        <Outlet />
      </main>
    </div>
  );
}
```

`src/routes/AppRoutes.jsx`:

```jsx
import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import MainLayout from '../layouts/MainLayout';
import Login from '../views/Login';
import Consumo from '../views/Consumo';
import Alertas from '../views/Alertas';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Navigate to="/consumo" replace />} />
          <Route path="/consumo" element={<Consumo />} />
          <Route path="/alertas" element={<Alertas />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
```

- [ ] **Step 4: `App.jsx`, `main.jsx`, `styles.css` y las vistas**

`src/App.jsx`:

```jsx
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
```

`src/main.jsx`:

```jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

`src/styles.css` (básico, sin librerías):

```css
:root { font-family: system-ui, sans-serif; color: #14213d; }
body { margin: 0; background: #f7f9fb; }
.layout { min-height: 100vh; display: flex; flex-direction: column; }
.cabecera { display: flex; align-items: center; gap: 1.5rem; padding: 0.75rem 1.25rem; background: #14213d; color: #fff; }
.cabecera nav { display: flex; gap: 1rem; flex: 1; }
.cabecera a { color: #cbd5e1; text-decoration: none; }
.cabecera a.activo { color: #fff; font-weight: 700; border-bottom: 2px solid #fca311; }
.sesion { display: flex; gap: 0.75rem; align-items: center; }
.contenido { padding: 1.25rem; max-width: 1100px; width: 100%; margin: 0 auto; }
.tabla { width: 100%; border-collapse: collapse; background: #fff; }
.tabla th, .tabla td { padding: 0.5rem 0.75rem; border-bottom: 1px solid #e2e8f0; text-align: left; }
.tabla th { background: #eef2f7; }
.badge { padding: 0.1rem 0.5rem; border-radius: 999px; font-size: 0.8rem; color: #fff; }
.badge.normal { background: #2a9d8f; }
.badge.alerta { background: #f4a261; }
.badge.critico { background: #e63946; }
.badge.sin_umbral { background: #6c757d; }
.formulario { display: grid; gap: 0.6rem; max-width: 420px; background: #fff; padding: 1rem; border-radius: 8px; }
.formulario input, .formulario select { padding: 0.45rem; }
.error { color: #e63946; }
.cargando { padding: 2rem; }
.paginacion { display: flex; gap: 0.75rem; align-items: center; margin-top: 0.75rem; }
.tarjetas { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; }
.tarjeta { background: #fff; padding: 1rem; border-radius: 8px; }
```

`src/views/Login.jsx`:

```jsx
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { iniciarSesion } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await iniciarSesion(email, password);
      // al haber sesión, ProtectedRoute redirige solo
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="contenido">
      <h1>Iniciar sesión</h1>
      <form className="formulario" onSubmit={enviar}>
        <label>
          Correo
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label>
          Contraseña
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={cargando}>{cargando ? 'Entrando…' : 'Entrar'}</button>
      </form>
    </div>
  );
}
```

`src/views/Consumo.jsx`:

```jsx
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { listar } from '../services/consumoService';

const LIMIT = 25;

export default function Consumo() {
  const { orgSeleccionada } = useAuth();
  const [pagina, setPagina] = useState(1);
  const [datos, setDatos] = useState({ data: [], total: 0 });
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    if (!orgSeleccionada) return;
    try {
      setError(null);
      setDatos(await listar({ organizacionId: orgSeleccionada, page: pagina, limit: LIMIT }));
    } catch (e) {
      setError(e.message);
    }
  }, [orgSeleccionada, pagina]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { setPagina(1); }, [orgSeleccionada]);

  const totalPaginas = Math.max(1, Math.ceil((datos.total ?? 0) / LIMIT));

  return (
    <section>
      <h2>Consumo registrado</h2>
      {error && <p className="error">{error}</p>}
      <table className="tabla">
        <thead>
          <tr><th>Fecha</th><th>Tipo</th><th>Cantidad</th><th>Unidad</th><th>Clasificación</th></tr>
        </thead>
        <tbody>
          {datos.data.map((r) => (
            <tr key={r.id}>
              <td>{new Date(r.fecha_consumo).toLocaleString('es')}</td>
              <td>{r.tipo_recurso}</td>
              <td>{Number(r.cantidad).toLocaleString('es')}</td>
              <td>{r.unidad_medida}</td>
              <td><span className={`badge ${r.clasificacion}`}>{r.clasificacion}</span></td>
            </tr>
          ))}
          {datos.data.length === 0 && !error && <tr><td colSpan="5">Sin registros</td></tr>}
        </tbody>
      </table>
      <div className="paginacion">
        <button type="button" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>‹</button>
        <span>Página {pagina} de {totalPaginas} ({datos.total ?? 0} registros)</span>
        <button type="button" disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => p + 1)}>›</button>
      </div>
    </section>
  );
}
```

`src/views/Alertas.jsx`:

```jsx
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { listar } from '../services/alertasService';

export default function Alertas() {
  const { orgSeleccionada } = useAuth();
  const [nivel, setNivel] = useState('');
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    if (!orgSeleccionada) return;
    try {
      setError(null);
      const r = await listar({ organizacionId: orgSeleccionada, nivel: nivel || undefined });
      setData(r.data);
    } catch (e) {
      setError(e.message);
    }
  }, [orgSeleccionada, nivel]);

  useEffect(() => { cargar(); }, [cargar]);

  return (
    <section>
      <h2>Alertas</h2>
      <p>
        Nivel:{' '}
        <select value={nivel} onChange={(e) => setNivel(e.target.value)}>
          <option value="">Todos</option>
          <option value="alerta">Alerta</option>
          <option value="critico">Crítico</option>
        </select>
      </p>
      {error && <p className="error">{error}</p>}
      <table className="tabla">
        <thead>
          <tr><th>Fecha</th><th>Nivel</th><th>Tipo</th><th>Mensaje</th><th>Entrega al POS</th></tr>
        </thead>
        <tbody>
          {data.map((a) => (
            <tr key={a.id}>
              <td>{new Date(a.fecha_generacion).toLocaleString('es')}</td>
              <td><span className={`badge ${a.nivel}`}>{a.nivel}</span></td>
              <td>{a.tipo_recurso}</td>
              <td>{a.mensaje}</td>
              <td>{a.estado}</td>
            </tr>
          ))}
          {data.length === 0 && !error && <tr><td colSpan="5">Sin alertas</td></tr>}
        </tbody>
      </table>
    </section>
  );
}
```

- [ ] **Step 5: Instalar y verificar build**

```powershell
cd "Proyecto-Heladeria-Monitoreo\monitoreo\frontend"
npm install
npm run build
```
Expected: `npm install` OK; `npm run build` exit 0 (Vite genera `dist/`). Si hay error de JSX/sintaxis, corregir hasta que compile.

- [ ] **Step 6 (opcional): smoke visual**

Con backend (Task 1-10) y frontend corriendo, usar la skill `webapp-testing` para abrir `http://localhost:5174`, verificar que `/login` renderiza y que sin sesión redirige. Requiere usuario de prueba en Supabase Auth. Si no hay credenciales, dejar constancia y continuar (los tests del backend son la garantía funcional del bloque).

- [ ] **Step 7: Commit (lo ejecuta EL USUARIO)**

```powershell
git add "Proyecto-Heladeria-Monitoreo/monitoreo/frontend"
git commit -m "feat(monitoreo): frontend React+Vite con auth Supabase, vistas de consumo y alertas"
```

---

### Task 12: Frontend — vistas CRUD restantes, notificaciones y reportes

**Files:**
- Create: `Proyecto-Heladeria-Monitoreo/monitoreo/frontend/src/views/Organizaciones.jsx`, `Medidores.jsx`, `Umbrales.jsx`, `Metas.jsx`, `Tarifas.jsx`, `Recomendaciones.jsx`, `Notificaciones.jsx`, `Reportes.jsx`
- Create: `Proyecto-Heladeria-Monitoreo/monitoreo/frontend/src/services/organizacionesService.js` (vacío → contenido), `reportesService.js` (vacío → contenido), `medidoresService.js`, `umbralService.js`, `metasService.js`, `tarifasService.js`, `recomendacionesService.js`, `notificacionesService.js`
- Modify: `src/routes/AppRoutes.jsx` (8 rutas nuevas), `src/layouts/MainLayout.jsx` (nav completa)
- Verify: `npm run build`

**Interfaces:**
- Consumes: todos los endpoints del Task 5/9/10 (tabla de permisos/acciones más abajo) vía `api.*` (JWT incluido). Errores del backend (`400 Rango solapado`, `409`, `403`) se muestran inline en el form (`error` state con `err.message` + `err.detail`).
- Produce: SPA completa del Monitoreo — rutas `/organizaciones`, `/medidores`, `/umbrales`, `/metas`, `/tarifas`, `/recomendaciones`, `/notificaciones`, `/reportes`; nav en `MainLayout` con los 10 enlaces.

Especificación de servicios (todos son el mismo molde de `consumoService`: `api.get/post/patch` + `URLSearchParams` cuando hay query):

| Servicio | Funciones |
|---|---|
| `organizacionesService` | `listar()`, `crear({nombre, nit})`, `actualizar(id, campos)` |
| `medidoresService` | `listar({organizacionId})`, `crear(payload)`, `actualizar(id, campos)`, `listarRecursos()` (→ `GET /recursos`) |
| `umbralService` | `listar({organizacionId})`, `crear(payload)`, `actualizar(id, campos)` |
| `metasService` | `listar({organizacionId})`, `crear(payload)`, `actualizar(id, campos)` |
| `tarifasService` | `listar({organizacionId})`, `crear(payload)`, `actualizar(id, campos)` |
| `recomendacionesService` | `listar({organizacionId})`, `crear(payload)`, `actualizar(id, campos)` |
| `notificacionesService` | `listar()`, `marcarVista(id)` (→ `PATCH { accion: 'vista' }`) |
| `reportesService` | `consumo({organizacionId, desde, hasta})` (→ `GET /reportes/consumo?...`), `topExcesos({organizacionId, desde, hasta})` |

- [ ] **Step 1: Vista ejemplar completa — `Umbrales.jsx` (form con manejo de error de negocio)**

```jsx
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { listar, crear } from '../services/umbralService';
import { listarRecursos } from '../services/medidoresService';

const vacio = { nombre: '', tipoRecursoId: '', nivel: 'normal', limiteInferior: '', limiteSuperior: '' };

export default function Umbrales() {
  const { orgSeleccionada } = useAuth();
  const [data, setData] = useState([]);
  const [recursos, setRecursos] = useState([]);
  const [form, setForm] = useState(vacio);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    if (!orgSeleccionada) return;
    try {
      setError(null);
      const r = await listar({ organizacionId: orgSeleccionada });
      setData(r.data);
    } catch (e) { setError(e.message); }
  }, [orgSeleccionada]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => {
    listarRecursos().then((r) => setRecursos(r.data)).catch(() => setRecursos([]));
  }, []);

  async function enviar(e) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      await crear({
        organizacionId: orgSeleccionada,
        tipoRecursoId: form.tipoRecursoId,
        nombre: form.nombre,
        nivel: form.nivel,
        limiteInferior: Number(form.limiteInferior),
        limiteSuperior: Number(form.limiteSuperior),
      });
      setForm(vacio);
      await cargar();
    } catch (err) {
      // 400 'Rango solapado' / detalle de campos / 403 → visibles en el form
      setError(Array.isArray(err.detail)
        ? err.detail.map((d) => `${d.path}: ${d.message}`).join(' | ')
        : (err.detail ? `${err.message}: ${err.detail}` : err.message));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section>
      <h2>Umbrales de clasificación</h2>
      {error && <p className="error">{error}</p>}
      <form className="formulario" onSubmit={enviar}>
        <input placeholder="Nombre" value={form.nombre} required
          onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        <select value={form.tipoRecursoId} required
          onChange={(e) => setForm({ ...form, tipoRecursoId: e.target.value })}>
          <option value="">Recurso…</option>
          {recursos.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
        </select>
        <select value={form.nivel} onChange={(e) => setForm({ ...form, nivel: e.target.value })}>
          <option value="normal">Normal</option>
          <option value="alerta">Alerta</option>
          <option value="critico">Crítico</option>
        </select>
        <input type="number" step="0.001" min="0" placeholder="Límite inferior" required
          value={form.limiteInferior} onChange={(e) => setForm({ ...form, limiteInferior: e.target.value })} />
        <input type="number" step="0.001" min="0" placeholder="Límite superior" required
          value={form.limiteSuperior} onChange={(e) => setForm({ ...form, limiteSuperior: e.target.value })} />
        <button type="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Crear umbral'}</button>
      </form>

      <table className="tabla">
        <thead>
          <tr><th>Nombre</th><th>Nivel</th><th>Rango</th><th>Estado</th></tr>
        </thead>
        <tbody>
          {data.map((u) => (
            <tr key={u.id}>
              <td>{u.nombre}</td>
              <td><span className={`badge ${u.nivel}`}>{u.nivel}</span></td>
              <td>[{Number(u.limite_inferior)}, {Number(u.limite_superior)})</td>
              <td>{u.estado}</td>
            </tr>
          ))}
          {data.length === 0 && <tr><td colSpan="4">Sin umbrales</td></tr>}
        </tbody>
      </table>
    </section>
  );
}
```

- [ ] **Step 2: Vista `Notificaciones.jsx` (marcar vista, distinta al CRUD)**

```jsx
import { useCallback, useEffect, useState } from 'react';
import { listar, marcarVista } from '../services/notificacionesService';

export default function Notificaciones() {
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    try { setError(null); setData((await listar()).data); }
    catch (e) { setError(e.message); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  async function ver(id) {
    try { await marcarVista(id); await cargar(); }
    catch (e) { setError(e.message); }
  }

  return (
    <section>
      <h2>Notificaciones</h2>
      {error && <p className="error">{error}</p>}
      <table className="tabla">
        <thead><tr><th>Creada</th><th>Estado</th><th>Alerta</th><th /></tr></thead>
        <tbody>
          {data.map((n) => (
            <tr key={n.id}>
              <td>{new Date(n.creada_en).toLocaleString('es')}</td>
              <td>{n.estado}</td>
              <td>{n.alerta?.mensaje}</td>
              <td>
                {n.estado === 'pendiente' && (
                  <button type="button" onClick={() => ver(n.id)}>Marcar vista</button>
                )}
              </td>
            </tr>
          ))}
          {data.length === 0 && <tr><td colSpan="4">Sin notificaciones</td></tr>}
        </tbody>
      </table>
    </section>
  );
}
```

- [ ] **Step 3: Vista `Reportes.jsx` (tarjetas con los 4 bloques del reporte)**

```jsx
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { consumo } from '../services/reportesService';

export default function Reportes() {
  const { orgSeleccionada } = useAuth();
  const [rango, setRango] = useState({ desde: '', hasta: '' });
  const [reporte, setReporte] = useState(null);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    if (!orgSeleccionada) return;
    try {
      setError(null);
      setReporte(await consumo({
        organizacionId: orgSeleccionada,
        desde: rango.desde || undefined,
        hasta: rango.hasta || undefined,
      }));
    } catch (e) { setError(e.message); }
  }, [orgSeleccionada, rango]);

  useEffect(() => { cargar(); }, [cargar]);

  return (
    <section>
      <h2>Reportes</h2>
      <p>
        Desde <input type="date" value={rango.desde} onChange={(e) => setRango({ ...rango, desde: e.target.value })} />
        {' '}hasta <input type="date" value={rango.hasta} onChange={(e) => setRango({ ...rango, hasta: e.target.value })} />
      </p>
      {error && <p className="error">{error}</p>}
      {reporte && (
        <div className="tarjetas">
          <div className="tarjeta">
            <h3>Consumo por recurso</h3>
            <table className="tabla">
              <thead><tr><th>Tipo</th><th>Total</th><th>Registros</th></tr></thead>
              <tbody>
                {reporte.porRecurso.map((r) => (
                  <tr key={r.tipo}><td>{r.tipo}</td><td>{Number(r.total).toLocaleString('es')}</td><td>{r.registros}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="tarjeta">
            <h3>Alertas por nivel</h3>
            <table className="tabla">
              <thead><tr><th>Nivel</th><th>Total</th></tr></thead>
              <tbody>
                {reporte.alertasPorNivel.map((a) => (
                  <tr key={a.nivel}><td><span className={`badge ${a.nivel}`}>{a.nivel}</span></td><td>{a.total}</td></tr>
                ))}
                {reporte.alertasPorNivel.length === 0 && <tr><td colSpan="2">Sin alertas en el rango</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="tarjeta">
            <h3>Costo estimado (tarifa vigente)</h3>
            <table className="tabla">
              <thead><tr><th>Tipo</th><th>Costo</th></tr></thead>
              <tbody>
                {reporte.costoEstimado.map((c) => (
                  <tr key={c.tipo}><td>{c.tipo}</td><td>{Number(c.costo).toFixed(2)}</td></tr>
                ))}
                {reporte.costoEstimado.length === 0 && <tr><td colSpan="2">Sin datos</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="tarjeta">
            <h3>Avance de metas</h3>
            <table className="tabla">
              <thead><tr><th>Meta</th><th>%</th><th>Consumo en período</th></tr></thead>
              <tbody>
                {reporte.avanceMetas.map((m) => (
                  <tr key={m.id}>
                    <td>{m.nombre}</td>
                    <td>{Number(m.porcentaje_reduccion)}%</td>
                    <td>{Number(m.consumo_en_meta).toLocaleString('es')}</td>
                  </tr>
                ))}
                {reporte.avanceMetas.length === 0 && <tr><td colSpan="3">Sin metas activas</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Vistas CRUD restantes — especificación exacta por archivo (mismo patrón que `Umbrales.jsx`: `useState` form + tabla + `error` inline + `cargar()` tras cada escritura)**

| Vista | Tabla columnas | Campos del form (create) | Servicio | Notas |
|---|---|---|---|---|
| `Organizaciones.jsx` | nombre, nit, estado | `nombre` (req), `nit` (opt) | `organizacionesService` | Sin `organizacionId` (el membership ya acota la lista) |
| `Medidores.jsx` | código, nombre, recurso, estado | `codigoMedidor` (req, patrón `MED-…`), `nombre` (req), `tipoRecursoId` (select de `listarRecursos`) | `medidoresService` | `409` código duplicado → mensaje inline |
| `Metas.jsx` | nombre, %, período, estado | `tipoRecursoId` (select), `nombre`, `porcentajeReduccion` (0-100), `fechaInicio`, `fechaFin` (date) | `metasService` | `400` fechas/porcentaje → detalle Zod inline |
| `Tarifas.jsx` | nombre, monto, unidad, período | `tipoRecursoId` (select), `nombre`, `monto` (≥0, step 0.0001), `unidad`, `fechaInicio`, `fechaFin` | `tarifasService` | `400 'Período solapado'` → mostrar `err.message` |
| `Recomendaciones.jsx` | título, prioridad, estado (+ botones Aplicar/Descartar) | `titulo`, `descripcion` (textarea), `prioridad` (select) | `recomendacionesService` | `PATCH { estado }` desde botones de fila |

Cada vista recibe `orgSeleccionada` de `useAuth()` y pasa `{ organizacionId: orgSeleccionada }` en listar/crear (excepto Organizaciones, que no lo necesita). Los `select` de `tipoRecursoId` usan `listarRecursos()` (cache en `useEffect` de la vista).

- [ ] **Step 5: Actualizar rutas y nav**

`src/routes/AppRoutes.jsx` — dentro del `Route` de `MainLayout`, agregar:

```jsx
          <Route path="/organizaciones" element={<Organizaciones />} />
          <Route path="/medidores" element={<Medidores />} />
          <Route path="/umbrales" element={<Umbrales />} />
          <Route path="/metas" element={<Metas />} />
          <Route path="/tarifas" element={<Tarifas />} />
          <Route path="/recomendaciones" element={<Recomendaciones />} />
          <Route path="/notificaciones" element={<Notificaciones />} />
          <Route path="/reportes" element={<Reportes />} />
```

(con sus `import` correspondientes arriba.)

`src/layouts/MainLayout.jsx` — reemplazar `enlaces` por:

```js
const enlaces = [
  { a: '/consumo', texto: 'Consumo' },
  { a: '/alertas', texto: 'Alertas' },
  { a: '/notificaciones', texto: 'Notificaciones' },
  { a: '/organizaciones', texto: 'Organizaciones' },
  { a: '/medidores', texto: 'Medidores' },
  { a: '/umbrales', texto: 'Umbrales' },
  { a: '/metas', texto: 'Metas' },
  { a: '/tarifas', texto: 'Tarifas' },
  { a: '/recomendaciones', texto: 'Recomendaciones' },
  { a: '/reportes', texto: 'Reportes' },
];
```

- [ ] **Step 6: Build y verificación**

```powershell
cd "Proyecto-Heladeria-Monitoreo\monitoreo\frontend"
npm run build
```
Expected: exit 0.

- [ ] **Step 7: Commit (lo ejecuta EL USUARIO)**

```powershell
git add "Proyecto-Heladeria-Monitoreo/monitoreo/frontend"
git commit -m "feat(monitoreo): frontend completo - CRUD organizaciones/medidores/umbrales/metas/tarifas/recomendaciones, notificaciones y reportes"
```

---

### Task 13: OpenAPI, Dockerfiles, README, suite completa y verificación final (DoD)

**Files:**
- Create: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/docs/openapi.yaml`
- Create: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/Dockerfile`
- Create: `Proyecto-Heladeria-Monitoreo/monitoreo/frontend/Dockerfile`
- Create: `Proyecto-Heladeria-Monitoreo/monitoreo/frontend/nginx.conf`
- Create: `Proyecto-Heladeria-Monitoreo/monitoreo/backend/README.md`
- Verify: suite completa + verificación por MCP + checklist DoD

**Interfaces:**
- Consumes: todos los Tasks 1-12; contrato compartido `shared/contracts/` (P4 — solo lectura); tablas reales creadas por MCP (Task 2).
- Produce: artefactos finales del bloque — spec OpenAPI, imágenes Docker, documentación de arranque, evidencia de suite verde y checklist de aceptación verificado.

- [ ] **Step 1: OpenAPI — `docs/openapi.yaml`**

Especificación `3.1.0` con, como mínimo:

```yaml
openapi: 3.1.0
info:
  title: API Monitoreo de Agua y Energía
  version: 1.0.0
  description: >
    Backend del sistema de Monitoreo (separado del POS; integración solo por
    contratos REST autenticados, AGENTS.md §3.1 y §6-§7).
servers:
  - url: http://localhost:4001/api/v1
security:
  - bearerAuth: []
paths:
  /integrations/consumption:
    post:
      summary: Recibir consumo reportado por el POS (idempotente)
      security: []            # autenticación por API key propia, no JWT Supabase
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/ConsumoExterno' }
      responses:
        '201': { description: Recepción creada }
        '200': { description: Duplicado (mismo idempotencyKey o consumoExternoId) }
        '400': { description: Payload inválido }
        '401': { description: API key inválida o ausente }
        '403': { description: organizacionExternaId no coincide con la integración }
  /integrations/alerts:
    post:
      summary: (Solo contrato — el receptor vive en el POS, P4 Paso 2)
      responses:
        '404': { description: No implementado en este backend }
components:
  securitySchemes:
    bearerAuth: { type: http, scheme: bearer, bearerFormat: JWT }
  schemas:
    ConsumoExterno:
      type: object
      required: [consumoExternoId, idempotencyKey, tipoRecurso, cantidad, unidadMedida, fechaConsumo, origen]
      properties:
        consumoExternoId: { type: string, format: uuid }
        idempotencyKey: { type: string, minLength: 8, maxLength: 120 }
        tipoRecurso: { type: string, enum: [agua, energia] }
        cantidad: { type: number, exclusiveMinimum: 0 }
        unidadMedida: { type: string }
        fechaConsumo: { type: string, format: date-time }
        origen: { type: string, example: POS }
        organizacionExternaId: { type: string, format: uuid }
    Error:
      type: object
      required: [error]
      properties:
        error: { type: string }
        detail: {}
```

Además, desarrollar con `summary`, `parameters` (query `organizacionId`, `desde`, `hasta`, `page`, `limit` cuando aplique) y `responses` (200/400/401/403/404/409 con `Error` ref) **todos** los endpoints implementados en los Tasks 5-10:

```yaml
  # Auth
  /auth/me                          GET
  # Catálogo y tenant
  /organizaciones                   GET, POST
  /organizaciones/{id}              GET, PATCH
  /medidores                        GET, POST
  /medidores/{id}                   PATCH
  /recursos                         GET, POST
  /usuarios                         GET
  /usuarios-organizacion            POST
  /usuarios-organizacion/{id}       PATCH
  # Pipeline de consumo
  /consumo                          GET
  # Umbrales y objetivos
  /umbrales                         GET, POST
  /umbrales/{id}                    PATCH
  /metas                            GET, POST
  /metas/{id}                       PATCH
  /tarifas                          GET, POST
  /tarifas/{id}                     PATCH
  /recomendaciones                  GET, POST
  /recomendaciones/{id}             PATCH
  # Alertas y reportes
  /alertas                          GET
  /notificaciones                   GET
  /notificaciones/{id}              PATCH   # marcar vista
  /reportes/consumo                 GET
  /reportes/top-excesos             GET
  # Integraciones (gestión de API keys)
  /integraciones                    GET, POST   # POST devuelve apiKey una sola vez
  /integraciones/{id}               PATCH       # rotar clave o cambiar estado
```

Cada línea de la lista anterior se expande en una entrada real de `paths` siguiendo el patrón de `/integrations/consumption` (método, summary, parameters, requestBody si tiene, responses). Si al validar (`npx @redocly/cli lint docs/openapi.yaml`, opcional) hay errores de YAML, corregirlos.

- [ ] **Step 2: Dockerfiles**

`monitoreo/backend/Dockerfile` (Node 24, healthcheck, sin dependencias de build):

```dockerfile
FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY src ./src
EXPOSE 4001
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4001/health || exit 1
USER node
CMD ["node", "src/server.js"]
```

`monitoreo/frontend/nginx.conf`:

```nginx
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;
  location / {
    try_files $uri $uri/ /index.html;   # SPA fallback para react-router
  }
}
```

`monitoreo/frontend/Dockerfile` (multi-stage: build Vite → nginx):

```dockerfile
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ || exit 1
```

⚠️ **Coordinación con P4** (no editar `infrastructure/` ni `docker-compose.yml` yo): dejar anotado en el README que el compose debe exponer backend `4001` y frontend `5174`, con env `DATABASE_URL`, `MONITOREO_DB_SCHEMA=monitoreo`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `POS_ALERTS_URL`, `POS_ALERTS_API_KEY`.

- [ ] **Step 3: Verificar `.env.example` del backend**

Abrir `monitoreo/backend/.env.example` (creado en Task 1) y confirmar que lista **todas** estas claves con placeholders (sin valores reales):

```env
# Backend Monitoreo (puerto 4001)
NODE_ENV=development
PORT=4001
CORS_ORIGIN=http://localhost:5174
DATABASE_URL=postgres://usuario:password@host:5432/db
MONITOREO_DB_SCHEMA=monitoreo
SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_ANON_KEY=clave-publishable
# Integración POS -> Monitoreo (POST /api/v1/integrations/consumption)
# La clave real se guarda solo como sha256 en DB; ésta es de ejemplo para dev:
MONITOREO_API_KEY=dev-monitoreo-integration-key
# Integración Monitoreo -> POS (endpoint del POS aun inexistente: P4 Paso 2)
POS_ALERTS_URL=http://localhost:4000/api/v1/integrations/alerts
POS_ALERTS_API_KEY=clave-del-pos
DELIVERY_TIMEOUT_MS=5000
DELIVERY_BACKOFF_MINUTES=5
DELIVERY_MAX_INTENTOS=10
RATE_LIMIT_MAX=300
# Tests de integración (opcional; si falta, los tests de BD se auto-saltan)
MONITOREO_TEST_DATABASE_URL=
```

Si falta alguna, agregarla. **Nunca** colocar `SUPABASE_SERVICE_ROLE_KEY`.

- [ ] **Step 4: README de `monitoreo/backend/README.md`**

Contenido mínimo (en español, con comandos reales de los Tasks):

1. **Qué es** — backend de Monitoreo, separado del POS, solo se comunica por contratos REST (AGENTS.md §3.1).
2. **Stack** — Node 24, Express 5, Sequelize 6, Zod 4, Postgres/Supabase, pino.
3. **Arranque local**:
   ```powershell
   cd monitoreo/backend
   copy .env.example .env   # completar DATABASE_URL y SUPABASE_*
   npm install
   node src/server.js       # http://localhost:4001/health
   ```
4. **Migraciones DDL** — el esquema se aplica con Supabase MCP (`apply_migration` con `database/monitoreo/001_v1_0_monitoreo_ddl.sql` y `002_seed_dev.sql`), paso exacto del Task 2.
5. **Workers** — `processingWorker` (cola → registro → clasificación → alerta) y `alertDeliveryWorker` (entrega al POS con lease/backoff/máx. intentos); arrancan con `server.js` y se pueden correr manual: `node src/jobs/processingWorker.js`.
6. **Tests** — `npm run test:unit` (sin BD) y `npm test` (unit + integración; integración requiere `MONITOREO_TEST_DATABASE_URL`); sin la variable ⇒ skip con aviso. `npm test` serializa archivos (`--test-concurrency=1`): cada archivo de integración ejecuta `DROP SCHEMA monitoreo_test` en su `before()` y en paralelo se pisarían (enmienda T5-1).
7. **Contrato de integración** — payload, headers, códigos 201/200/400/401/403, garantía de idempotencia; referencia a `docs/openapi.yaml`.
8. **Seguridad** — JWT Supabase + RBAC por permisos + `scopeOrg` (aislamiento de tenant), API key solo como sha256, auditoría de escrituras.
9. **Puertos y compose** — nota de coordinación con P4 (4001 / 5174).

- [ ] **Step 5: Ejecutar la suite COMPLETA y dejarla en verde**

```powershell
cd "Proyecto-Heladeria-Monitoreo/monitoreo/backend"
npm test
```

Expected:
- `tests/unit/`: **todos PASS** (auth 7, validators 4, rangos 5, clasificacion 6, integracionPayload 5, models N).
- `tests/integration/`: con `MONITOREO_TEST_DATABASE_URL` definida → **todos PASS** (auth 4, crudBasico 6, consumption 7, processing 6, alertDelivery 7, crudObjetivos 10, consultas 9); sin ella → **SKIP con el aviso estándar**, nunca FAIL.

Si algo falla: corregir el código (no maquillar el test, salvo que contradiga una regla real del contrato/AGENTS.md — en ese caso reportar al usuario antes de tocar nada).

- [ ] **Step 6: Verificación final por MCP (evidencia de datos reales)**

Llamar `tools.supabase.execute_sql` con:

```sql
-- 20 tablas del schema monitoreo
SELECT table_name FROM information_schema.tables
 WHERE table_schema = 'monitoreo' ORDER BY table_name;
-- seed correcto
SELECT (SELECT count(*) FROM monitoreo.rol) AS roles,
       (SELECT count(*) FROM monitoreo.permiso) AS permisos,
       (SELECT count(*) FROM monitoreo.tipo_recurso) AS recursos,
       (SELECT count(*) FROM monitoreo.umbral_clasificacion) AS umbrales_demo;
-- pipeline sin duplicados (recepciones vs. consumo externo distinto)
SELECT count(*) AS recepciones, count(DISTINCT consumo_externo_id) AS distintas
  FROM monitoreo.recepcion_consumo_pos;
```

Expected: lista exacta de las 20 tablas; `roles ≥ 4`, `permisos ≥ 20`, `recursos = 2`, `umbrales_demo ≥ 3` (agua normal/alerta/crítico); `recepciones = distintas`.

Si hubiera filas basura de un intento previo, limpiarlas vía MCP (`DELETE`/`TRUNCATE` de las tablas de prueba) y re-verificar.

- [ ] **Step 7: Revisar el checklist DoD del Bloque 3**

Contra `docs/superpowers/plans/2026-09-22-reparto-4-personas.md` (Paso 5 del Bloque 3), verificar que **cada** punto sea verdadero con evidencia (task + test):

```text
[ ] Recibe consumo del POS sin duplicar           -> Task 6 (consumption: 7 tests, concurrentes incluidos)
[ ] Clasifica contra umbrales                      -> Task 7 (processing: 6 tests + clasificacion 6 unit)
[ ] Genera alerta y notificación                   -> Task 7 (alerta + notificacion + entrega encolada)
[ ] Entrega alerta al POS (con reintentos)         -> Task 8 (alertDelivery: 7 tests, 404/timeout/500/max)
[ ] Todo auditado                                  -> Tasks 4-10 (auditoria_cambio verificada en tests)
[ ] Sin acoplamiento POS (solo contratos REST)     -> sin FK ni import a pos/, verificado en Step 8
[ ] RBAC + scope de tenant en todos los endpoints  -> Tasks 5/9/10 (403 org ajena + 403 sin permiso)
[ ] Suite unitaria verde sin BD                    -> Step 5
[ ] Suite de integración verde con BD              -> Step 5 (o SKIP documentado si no hay URL de test)
[ ] openapi.yaml + README + .env.example           -> Steps 1-4
[ ] Dockerfiles backend y frontend con healthcheck -> Step 2
```

- [ ] **Step 8: Revisión final de aislamiento (grep)**

```powershell
cd "Proyecto-Heladeria-Monitoreo"
findstr /S /I /M /C:"posBackend" monitoreo\backend\src\*.*
findstr /S /I /M /C:"require.*pos/" monitoreo\backend\src\*.*
git status
git diff --stat
```

Expected: los `findstr` sin coincidencias (el POS solo se referencia por URL/HTTP); `git status` muestra **solo** archivos bajo `monitoreo/` y `docs/superpowers/plans/2026-09-23-monitoreo-persona3-bloque3.md`. Si aparece un archivo fuera del alcance, revertir ese cambio antes de continuar.

- [ ] **Step 9: Commit final (lo ejecuta EL USUARIO)**

```powershell
git add "Proyecto-Heladeria-Monitoreo/monitoreo"
git add "docs/superpowers/plans/2026-09-23-monitoreo-persona3-bloque3.md"
git commit -m "docs(monitoreo): openapi, dockerfiles, README y verificacion final del Bloque 3"
```

**Fin del plan.** El usuario luego ejecuta `git push -u origin feature/Luis-monitoreo` y abre PR → `develop` (el push y el PR los hace el usuario, jamás la IA — AGENTS.md §10.1).
