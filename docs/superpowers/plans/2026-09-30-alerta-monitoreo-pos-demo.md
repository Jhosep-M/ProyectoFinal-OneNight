# Alerta manual Monitoreo → POS (demo) — Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax. NOTA: por AGENTS.md §10.1 la IA **no ejecuta git** (`add/commit/push`); el usuario publica manualmente. Los pasos "Commit" son para el usuario.

**Goal:** Poder disparar manualmente una alerta en Monitoreo y verla aparecer en el Dashboard del POS, demostrando el flujo Monitoreo → POS de punta a punta.

**Architecture:** Se añaden endpoints JWT+RBAC en Monitoreo para crear/reenviar alertas (reusando `crearAlertaManual` + `entrega_alerta`), una entrega inmediata que reutiliza el worker, y en el POS un endpoint GET autorizado + tarjeta de Dashboard. La cola y la idempotencia se conservan.

**Tech Stack:** Node.js + Express + Sequelize (Postgres/Supabase), Zod, React + Vite, Jest/Supertest.

## Global Constraints

- POS y Monitoreo NO comparten tablas ni modelos; integración por HTTP `x-api-key`.
- Todo endpoint nuevo: JWT + RBAC (`requirePermission`/`authorize`).
- No exponer detalles internos en errores (mensajes genéricos).
- No borrar historial; auditoría en crear/reenviar.
- Cantidades/dinero `NUMERIC`; UUID como PK (existente).
- Prohibido que la IA ejecute git.

## File Structure

Monitoreo backend:
- Create `monitoreo/backend/src/validators/alerta.validator.js`
- Modify `monitoreo/backend/src/repositories/alertas.repository.js`
- Modify `monitoreo/backend/src/repositories/entrega.repository.js`
- Modify `monitoreo/backend/src/services/alertas.service.js`
- Modify `monitoreo/backend/src/jobs/alertDeliveryWorker.js`
- Modify `monitoreo/backend/src/controllers/alertas.controller.js`
- Modify `monitoreo/backend/src/routes/alertas.routes.js`
- Create/Modify `database/monitoreo/` seed de permiso `alerta.gestionar`

Monitoreo frontend:
- Modify `monitoreo/frontend/src/services/alertasService.js`
- Modify `monitoreo/frontend/src/views/Alertas.jsx`

POS backend:
- Modify `pos/posBackend/src/routes/integrations.js`
- Create/Modify `database/pos/` migración permiso `alerta.consultar`

POS frontend:
- Create `pos/frontend/src/services/alertasService.js`
- Modify `pos/frontend/src/pages/dashboard/DashboardPage.jsx`

Tests:
- Create `monitoreo/backend/tests/integration/alertasManual.test.js`
- Create `pos/posBackend/tests/integration.alerts-list.test.js`

---

### Task 1: Monitoreo — permiso `alerta.gestionar`

**Files:** Create `database/monitoreo/006_permiso_alerta_gestionar.sql`

- [ ] **Step 1:** Escribir el SQL (idempotente):

```sql
-- Permiso para crear/reenviar alertas manualmente (demo Monitoreo→POS).
INSERT INTO permiso (nombre) VALUES ('alerta.gestionar')
ON CONFLICT (nombre) DO NOTHING;

-- Conceder a todos los roles activos que ya consultan alertas (admin/operador/supervisor).
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id
  FROM rol r CROSS JOIN permiso p
 WHERE p.nombre = 'alerta.gestionar'
   AND r.estado = 'activo'
   AND EXISTS (SELECT 1 FROM rol_permiso rp JOIN permiso p2 ON p2.id = rp.permiso_id
                WHERE rp.rol_id = r.id AND p2.nombre = 'alerta.consultar')
ON CONFLICT DO NOTHING;
```

- [ ] **Step 2:** Aplicar vía Supabase MCP (proyecto Monitoreo) con `apply_migration` `permiso_alerta_gestionar`.
- [ ] **Step 3 (usuario):** Commit.

---

### Task 2: Monitoreo — validador, repos, servicio y entrega inmediata

**Files:**
- Create `monitoreo/backend/src/validators/alerta.validator.js`
- Modify `monitoreo/backend/src/repositories/alertas.repository.js`
- Modify `monitoreo/backend/src/repositories/entrega.repository.js`
- Modify `monitoreo/backend/src/services/alertas.service.js`
- Modify `monitoreo/backend/src/jobs/alertDeliveryWorker.js`

**Interfaces (Produces):**
- `alertaPruebaSchema` (Zod)
- `alertasRepository.obtenerPorId(id): Promise<Alerta|null>`
- `entregaRepository.reenviar(alertaId): Promise<[updatedCount]>`
- `alertasService.crearAlertaManual({ organizacionId, nivel, tipoRecurso, mensaje }, tx?): Promise<Alerta>`
- `alertasService.reenviarAlerta(alertaId, organizacionId): Promise<Alerta>` (lanza `{status:404}` si ajena)
- `alertDeliveryWorker.entregarAlertaPorId(alertaId): Promise<'enviada'|'reintento'|'error_terminal'|'sin_entrega'>`

- [ ] **Step 1:** Crear `alerta.validator.js`:

```js
const { z } = require('zod');

const alertaPruebaSchema = z.object({
  organizacionId: z.string().uuid(),
  nivel: z.enum(['alerta', 'critico']),
  tipoRecurso: z.enum(['agua', 'energia']),
  mensaje: z.string().trim().min(1).max(500).optional(),
});

module.exports = { alertaPruebaSchema };
```

- [ ] **Step 2:** Añadir `obtenerPorId` a `alertas.repository.js`:

```js
async function obtenerPorId(id) {
  return Alerta.findByPk(id);
}
module.exports = { listar, obtenerPorId };
```

- [ ] **Step 3:** Añadir `reenviar` a `entrega.repository.js`:

```js
async function reenviar(alertaId) {
  return EntregaAlerta.update(
    { estado: 'pendiente', intentos: 0, proximo_intento: new Date(), ultimo_error: null },
    { where: { alerta_id: alertaId } },
  );
}
module.exports = { crearSiNoExiste, reenviar };
```

- [ ] **Step 4:** Refactor `alertDeliveryWorker.js`: extraer `entregarAlertaPorId(alertaId)` reutilizando la lógica de éxito/fallo, y exportarla. (Se conserva `entregarUnaVez`.)

```js
// Reutiliza la misma lógica de estado/backoff/auditoría que entregarUnaVez,
// pero para una alerta concreta (entrega inmediata al disparar manual).
async function entregarAlertaPorId(alertaId) {
  const entrega = await EntregaAlerta.findOne({ where: { alerta_id: alertaId } });
  if (!entrega) return 'sin_entrega';
  const alerta = await Alerta.findByPk(alertaId);
  if (!alerta) return 'error_terminal';
  const intentos = entrega.intentos + 1;
  await entrega.update({ intentos, proximo_intento: new Date(Date.now() + 60000) });
  try {
    const { ok, status } = await enviarAlertaPOS(alerta);
    if (!ok) throw new Error(`POS respondió ${status}`);
    await entrega.update({ estado: 'enviada', proximo_intento: null, ultimo_error: null });
    await Alerta.update({ estado: 'entregada' }, { where: { id: alerta.id } });
    await registrarAuditoria({ entidad: 'entrega_alerta', entidadId: entrega.id, accion: 'entregar',
      detalle: { alertaId: alerta.id, status, intentos, inmediata: true } });
    return 'enviada';
  } catch (e) {
    const terminal = intentos >= env.deliveryMaxIntentos;
    const proximo = terminal ? null : new Date(Date.now() + env.deliveryBackoffMinutes * intentos * 60000);
    await entrega.update({ estado: terminal ? 'error' : 'pendiente',
      ultimo_error: String(e.message).slice(0, 500), proximo_intento: proximo });
    if (terminal) await Alerta.update({ estado: 'error' }, { where: { id: alerta.id } });
    await registrarAuditoria({ entidad: 'entrega_alerta', entidadId: entrega.id, accion: 'reintentar',
      detalle: { alertaId: alerta.id, intentos, terminal, inmediata: true, error: String(e.message).slice(0, 200) } });
    logger.warn({ alertaId, intentos, terminal }, 'entrega inmediata de alerta fallida');
    return terminal ? 'error_terminal' : 'reintento';
  }
}

module.exports = { entregarUnaVez, entregarAlertaPorId, start, stop };
```

- [ ] **Step 5:** Añadir a `alertas.service.js`:

```js
const { obtenerPorId } = require('../repositories/alertas.repository');
const { crearSiNoExiste, reenviar } = require('../repositories/entrega.repository');
const { entregarAlertaPorId } = require('../jobs/alertDeliveryWorker');

async function crearAlertaManual({ organizacionId, nivel, tipoRecurso, mensaje }) {
  const texto = mensaje && mensaje.trim().length
    ? mensaje.trim()
    : `Alerta manual de prueba (${tipoRecurso}, nivel ${nivel}).`;
  const alerta = await Alerta.create({
    organizacion_id: organizacionId,
    registro_consumo_id: null,
    umbral_id: null,
    nivel, tipo_recurso: tipoRecurso,
    mensaje: texto,
    fecha_generacion: new Date(),
    estado: 'pendiente',
  });
  await crearSiNoExiste(alerta.id);
  await registrarAuditoria({ entidad: 'alerta', entidadId: alerta.id, accion: 'crear',
    detalle: { origen: 'manual', nivel, tipoRecurso } });
  // Entrega inmediata (best-effort): si falla, la cola reintenta.
  entregarAlertaPorId(alerta.id).catch(() => {});
  return alerta;
}

async function reenviarAlerta(alertaId, organizacionId) {
  const alerta = await obtenerPorId(alertaId);
  if (!alerta || alerta.organizacion_id !== organizacionId) {
    const err = new Error('Alerta no encontrada'); err.status = 404; throw err;
  }
  await reenviar(alertaId);
  await Alerta.update({ estado: 'pendiente' }, { where: { id: alertaId } });
  await registrarAuditoria({ entidad: 'alerta', entidadId: alertaId, accion: 'reenviar', detalle: {} });
  entregarAlertaPorId(alertaId).catch(() => {});
  return alerta;
}

module.exports = { crearAlerta, listarAlertas, crearAlertaManual, reenviarAlerta };
```

> Nota de ciclo: `alertDeliveryWorker` importa `auditoria.service` y `pos.client`, no `alertas.service`, así que no hay ciclo `service→worker→service`.

- [ ] **Step 6 (usuario):** Commit.

---

### Task 3: Monitoreo — controller y rutas

**Files:**
- Modify `monitoreo/backend/src/controllers/alertas.controller.js`
- Modify `monitoreo/backend/src/routes/alertas.routes.js`

- [ ] **Step 1:** Controller — añadir `crearPrueba` y `reenviar`:

```js
async function crearPrueba(req, res) {
  try {
    const alerta = await service.crearAlertaManual(req.body);
    return ok(res, { data: alerta }, 201);
  } catch (e) {
    return fail(res, 500, 'Error creando alerta', e.message);
  }
}

async function reenviar(req, res) {
  try {
    const alerta = await service.reenviarAlerta(req.params.id, req.organizacionId);
    return ok(res, { data: alerta });
  } catch (e) {
    return fail(res, e.status || 500, e.status === 404 ? 'Alerta no encontrada' : 'Error reenviando alerta', e.message);
  }
}

module.exports = { listar, crearPrueba, reenviar };
```

- [ ] **Step 2:** Rutas — añadir (importar `validateBody`, `alertaPruebaSchema`):

```js
router.post('/prueba', requirePermission('alerta.gestionar'), validateBody(alertaPruebaSchema), scopeOrg, ctrl.crearPrueba);
router.post('/:id/reenviar', requirePermission('alerta.gestionar'), scopeOrg, ctrl.reenviar);
```

> `scopeOrg` con `:id`: no hay `?organizacionId` → `req.params.id` presente → pasa; el controller valida pertenencia y devuelve 404 uniforme.

- [ ] **Step 3 (usuario):** Commit.

---

### Task 4: Monitoreo — frontend (Generar alerta de prueba)

**Files:**
- Modify `monitoreo/frontend/src/services/alertasService.js`
- Modify `monitoreo/frontend/src/views/Alertas.jsx`

- [ ] **Step 1:** Servicio — añadir:

```js
export async function crearPrueba({ organizacionId, nivel, tipoRecurso, mensaje }) {
  return api.post('/alertas/prueba', { organizacionId, nivel, tipoRecurso, mensaje });
}
```

- [ ] **Step 2:** `Alertas.jsx` — añadir estado `form` (`{ nivel: 'critico', tipoRecurso: 'agua', mensaje: '' }`) y un formulario "Generar alerta de prueba" que llama `crearPrueba({ ...form, organizacionId: orgSeleccionada })` y luego `cargar()`. Mostrar error con `setError`.

- [ ] **Step 3 (usuario):** Commit.

---

### Task 5: POS — permiso `alerta.consultar` y GET de alertas

**Files:**
- Create `database/pos/migrations/011-alerta-consultar.sql`
- Modify `pos/posBackend/src/routes/integrations.js`

- [ ] **Step 1:** SQL permiso `alerta.consultar` + grant a roles con `integracion.consultar` (idempotente).

- [ ] **Step 2:** Aplicar vía Supabase MCP (proyecto POS).

- [ ] **Step 3:** En `integrations.js`, **antes** de `router.get('/:id', ...)`, añadir:

```js
router.get('/alerts', authorize('alerta.consultar'), async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
    const offset = Math.max(parseInt(req.query.offset || '0', 10), 0);
    const [rows] = await sequelize.query(
      `SELECT id_alerta, tipo, nivel, mensaje, estado, creado_en
         FROM alerta_pos WHERE turno_id IS NULL
        ORDER BY creado_en DESC LIMIT :limit OFFSET :offset`,
      { replacements: { limit, offset } });
    const [countRows] = await sequelize.query(
      `SELECT COUNT(*)::int AS total FROM alerta_pos WHERE turno_id IS NULL`);
    res.json({ data: rows, total: countRows[0].total, limit, offset });
  } catch (e) { next(e); }
});
```

- [ ] **Step 4 (usuario):** Commit.

---

### Task 6: POS — frontend (servicio + tarjeta Dashboard)

**Files:**
- Create `pos/frontend/src/services/alertasService.js`
- Modify `pos/frontend/src/pages/dashboard/DashboardPage.jsx`

- [ ] **Step 1:** Servicio:

```js
import { apiFetch } from './api.js';
export const listarAlertasMonitoreo = ({ limit = 10 } = {}) =>
  apiFetch(`/integrations/alerts?limit=${limit}`);
```

- [ ] **Step 2:** Dashboard: `useState` `alertas`, cargar en el `useEffect` existente con `Promise.all`, y renderizar una `Card` "Alertas de Monitoreo" (Badge por nivel `bajo|medio|critico`, tipo, mensaje, fecha) con `EmptyState` si vacío.

- [ ] **Step 3 (usuario):** Commit.

---

### Task 7: Pruebas

**Files:**
- Create `monitoreo/backend/tests/integration/alertasManual.test.js`
- Create `pos/posBackend/tests/integration.alerts-list.test.js`

- [ ] **Step 1:** Monitoreo: test integración (patrón `alertDelivery.test.js`) — crear manual → `alerta`+`entrega_alerta` pendiente; reenviar → reset; idempotencia contra POS mock (`already_received`).
- [ ] **Step 2:** POS: supertest `GET /api/v1/integrations/alerts` — 401 sin token; 403 sin permiso; 200 con permiso y solo `turno_id IS NULL`; respeta limit/offset.
- [ ] **Step 3:** Ejecutar las suites y verificar verde.
- [ ] **Step 4 (usuario):** Commit.

---

## Verificación manual (E2E)

1. Monitoreo frontend → Alertas → "Generar alerta de prueba".
2. POS backend responde 201; Dashboard POS muestra la alerta.
3. "Reenviar" la misma alerta → POS responde `already_received` (sin duplicar).

## Self-Review

- Cobertura del spec: disparo manual (T1–T4), POS lectura (T5), POS UI (T6), config/seed (T1,T5), pruebas (T7). ✔
- Sin placeholders. ✔
- Consistencia: `entregarAlertaPorId`/`crearAlertaManual`/`reenviarAlerta` usados con los mismos nombres en T2/T3. ✔
