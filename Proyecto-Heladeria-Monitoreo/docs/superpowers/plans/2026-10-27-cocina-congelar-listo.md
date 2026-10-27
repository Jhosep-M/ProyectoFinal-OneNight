# Cocina congelar listo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Al pulsar Listo en Cocina el contador queda congelado como `tardó X min` y nunca vuelve a `X min en espera` creciente, incluso si `fecha_listo` vino `null`.

**Architecture:** Defensa en 3 capas: migración 027 idempotente que crea/backfillea `pedido.fecha_listo`, backend que marca `fecha_listo` al transicionar a `listo` y auto-repara listos huérfanos en lectura, frontend que preserva/congela `fecha_listo` local para que `recargar()` y el polling de 15s no descongelen.

**Tech Stack:** Node.js + Express + Sequelize (SQL raw parametrizado), React + Vite, Vitest (frontend) / Jest + Supertest (backend), PostgreSQL/Supabase.

## Global Constraints

- Tipografía obligatoria: usar solo tokens `var(--bs-font-sans-serif)` / `var(--bs-font-serif)` / `var(--bs-font-numeric)` + `font-variant-numeric: tabular-nums` en cifras; prohibido hardcodear `'Source Sans 3'` / `'Playfair Display'` en componentes; serif solo en `h1-h6`, sans en UI.
- Auto-refresh obligatorio: mutación con actualización optimista `setState` inmediata + `await recargar()`; vista Cocina usa `useAutoRefresh(recargar, { intervalMs: 15000, onFocus: true })`, polling silencioso sin skeletons que borren el alert.
- Cocina solo permite `abierto → en_preparacion → listo`, sin ventas ni caja; transición inválida responde 409 humano; espejo `origen='venta_directa'` se muestra como cobrado y `POST /:id/cobrar` lo rechaza con 409.
- POS y Monitoreo no comparten tablas ni FKs; PK UUID; dinero con `NUMERIC`; no borrar ventas; auditar `pedido.estado` / `pedido.cobrar`.
- La IA solo edita working directory local y usa comandos git de lectura (`status`, `diff`, `log`); prohibido `add/commit/push/pull/fetch/merge` y publicar PRs.

---

## File Map

- `database/pos/migrations/027-pedido-fecha-listo-selfheal.sql` — CREATE idempotente + backfill (nuevo).
- `pos/posBackend/src/routes/orders.js:12-30,175-213` — GET lista/detalle + PATCH `/:id/estado` (modificar).
- `pos/posBackend/src/models/Pedido.js:1-18` — ya tiene `fecha_listo`, no tocar salvo comentario.
- `pos/frontend/src/pages/cocina/CocinaPage.jsx:18-47,57-119,150-170` — helpers `horaMs/fechaListoMs/minutosEspera/textoEspera` + `recargar/avanzar` (modificar).
- `pos/frontend/src/pages/dashboard/roles/CocinaDashboard.jsx:12-32,40-79` — mismos helpers + `recargar/avanzar` (modificar).
- `pos/frontend/src/pages/cocina/__tests__/CocinaPage.test.jsx` — añadir test listo-sin-marca (modificar).
- `pos/posBackend/tests/pedido-estado-cocina.test.js` — añadir tests self-heal (modificar).

---

### Task 1: Migración 027 self-heal `fecha_listo`

**Files:**
- Create: `database/pos/migrations/027-pedido-fecha-listo-selfheal.sql`
- Test: manual SQL en Supabase (ver pasos)

**Interfaces:**
- Consumes: tabla `public.pedido` con columnas `estado`, `fecha`, `fecha_listo` (puede no existir si 026 no corrió).
- Produces: columna `fecha_listo TIMESTAMPTZ NULL` garantizada + cero filas con `estado='listo' AND fecha_listo IS NULL`.

- [ ] **Step 1: Crear la migración 027 idempotente**

Crear `database/pos/migrations/027-pedido-fecha-listo-selfheal.sql` con este contenido exacto:

```sql
-- Migration 027 - Self-heal fecha_listo (refuerza 026).
-- Contexto: Cocina congela con fecha_listo - fecha. Si 026 no corrió en un
-- entorno o hay listos históricos sin marca, el frontend cae a NOW() - fecha
-- y el contador crece sin fin ("662 min en espera" en vez de "tardó X min").
-- Esta migración es idempotente y re-ejecuta el backfill.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'pedido'
       AND column_name = 'fecha_listo'
  ) THEN
    ALTER TABLE public.pedido
      ADD COLUMN fecha_listo TIMESTAMPTZ NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_pedido_estado_listo
  ON public.pedido (estado) WHERE estado = 'listo';

-- Backfill: congela los listos huérfanos al momento de aplicar.
-- Se usa NOW() (no fecha) para preservar honestamente cuánto llevan en cocina.
UPDATE public.pedido
SET fecha_listo = NOW()
WHERE estado = 'listo' AND fecha_listo IS NULL;
```

- [ ] **Step 2: Verificar sintaxis del archivo**

Run: `Get-Content Proyecto-Heladeria-Monitoreo/database/pos/migrations/027-pedido-fecha-listo-selfheal.sql`
Expected: muestra el contenido del Step 1 sin errores de codificación.

- [ ] **Step 3: Verificar en DB remota (solo lectura, no aplicar desde aquí si el flujo del equipo aplica migraciones por otro medio)**

Run (Supabase SQL editor o MCP `execute_sql` en solo lectura):
```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema='public' AND table_name='pedido' AND column_name='fecha_listo';
SELECT id_pedido, estado, fecha, fecha_listo FROM public.pedido
WHERE estado='listo' AND fecha_listo IS NULL LIMIT 20;
```
Expected: primera query dice si falta la columna; segunda lista los 3 pedidos de la captura (`662/643 min`). Guardar el conteo para verificar Task 2/5.

---

### Task 2: Backend — PATCH marca + GET auto-repara

**Files:**
- Modify: `pos/posBackend/src/routes/orders.js:12-30`
- Modify: `pos/posBackend/src/routes/orders.js:175-213`
- Test: `pos/posBackend/tests/pedido-estado-cocina.test.js`

**Interfaces:**
- Consumes: `sequelize.query(sql, { replacements, transaction })`, `auditLog()`, `estadoCocinaSchema`.
- Produces: `PATCH /api/v1/orders/:id/estado` siempre devuelve `fecha_listo` no-nula cuando `estado='listo'`; `GET /api/v1/orders` nunca devuelve `listo` con `fecha_listo` nula (auto-repara antes de leer).

- [ ] **Step 1: Escribir el failing test backend**

Añadir al final del `describe` en `pos/posBackend/tests/pedido-estado-cocina.test.js`:

```js
test('GET /orders auto-repara listos sin fecha_listo (mig 027)', async () => {
  sequelize.query.mockImplementation(async (sql) => {
    if (sql.includes("SET fecha_listo=NOW()") && sql.includes("estado='listo'")) {
      return [[]];
    }
    if (sql.includes('FROM pedido')) {
      return [[{ id_pedido: PEDIDO, estado: 'listo', fecha_listo: new Date().toISOString() }]];
    }
    return [[]];
  });
  const res = await request(app).get('/api/v1/orders');
  expect(res.status).toBe(200);
  const updateCall = sequelize.query.mock.calls.find(([s]) => s.includes("SET fecha_listo=NOW()"));
  expect(updateCall).toBeDefined();
});
```

- [ ] **Step 2: Correr el test para verlo fallar**

Run: `npm test -- pedido-estado-cocina` (en `Proyecto-Heladeria-Monitoreo/pos/posBackend`)
Expected: FAIL con `expect(updateCall).toBeDefined()` — `Received: undefined` porque `GET /` aún no auto-repara.

- [ ] **Step 3: Implementar auto-repara en `GET /`**

En `pos/posBackend/src/routes/orders.js`, reemplazar el handler `router.get('/', ...)` actual (líneas 12-21) por:

```js
router.get('/', authorize('pedido.consultar'), async (_req, res, next) => {
  try {
    // Mig 027 self-heal: repara listos huérfanos antes de leer para que
    // Cocina nunca reciba listo con fecha_listo null (contador infinito).
    await sequelize.query(
      `UPDATE pedido SET fecha_listo=NOW() WHERE estado='listo' AND fecha_listo IS NULL`
    );
    // mesa no tiene columna nombre (solo numero/estado) — usar numero.
    // pedido tampoco tiene columna total: se calcula desde detalle_pedido.
    // origen='venta_directa' = espejo de venta ya cobrada (solo cocina, no cobrable).
    // venta_id expone el enlace venta.pedido_id para que el frontend oculte Cobrar.
    const [rows] = await sequelize.query(`SELECT p.*, m.numero as mesa_numero, u.nombre as mesero_nombre, COALESCE((SELECT SUM(cantidad * precio_unitario) FROM detalle_pedido WHERE pedido_id = p.id_pedido), 0) AS total, v.id_venta AS venta_id FROM pedido p LEFT JOIN mesa m ON m.id_mesa=p.mesa_id LEFT JOIN usuario u ON u.id_usuario=p.mesero_id LEFT JOIN venta v ON v.pedido_id=p.id_pedido ORDER BY p.fecha DESC LIMIT 100`);
    res.json(rows);
  } catch (e) { next(e); }
});
```

No tocar el `UPDATE ... COALESCE(fecha_listo, NOW())` del `PATCH /:id/estado` (línea 201) — ya es correcto e idempotente. Verificar que sigue exactamente así:

```sql
UPDATE pedido SET estado=:estado, fecha_listo=CASE WHEN :estado='listo' THEN COALESCE(fecha_listo, NOW()) ELSE fecha_listo END WHERE id_pedido=:id RETURNING *
```

- [ ] **Step 4: Correr tests backend**

Run: `npm test -- pedido-estado-cocina` (en `Proyecto-Heladeria-Monitoreo/pos/posBackend`)
Expected: PASS, 7 tests (6 existentes + 1 nuevo). Si falla otro test por el `UPDATE` extra en el mock genérico `mockTransicion`, ajustar el mock para responder `[[]]` a sentencias `SET fecha_listo=NOW() WHERE estado='listo'` sin romper `FOR UPDATE`.

---

### Task 3: Frontend `CocinaPage.jsx` — no descongelar en `recargar()`

**Files:**
- Modify: `pos/frontend/src/pages/cocina/CocinaPage.jsx:1-119`
- Modify: `pos/frontend/src/pages/cocina/CocinaPage.jsx:150-170` (solo si el test lo exige; no cambiar estilos ni tipografía)

**Interfaces:**
- Consumes: `listarPedidos()`, `actualizarEstadoPedido(id, estado)`, `useAutoRefresh(recargar, { intervalMs: 15000, onFocus: true })`.
- Produces: `minutosEspera(p)` nunca crece cuando `p.estado==='listo'`; `textoEspera(p)` para `listo` siempre es `tardó X min`.

- [ ] **Step 1: Escribir el failing test frontend**

Añadir en `pos/frontend/src/pages/cocina/__tests__/CocinaPage.test.jsx` dentro del `describe('CocinaPage (HU-04)')`:

```jsx
it('listo sin fecha_listo (huérfano) se congela y dice tardó, no sigue en espera', async () => {
  const base = new Date('2026-10-26T10:00:00Z').toISOString();
  mocks.mockListarPedidos.mockResolvedValue([
    { id_pedido: 'p-huerfano', mesa_numero: null, estado: 'listo', total: 48, fecha: base, fecha_listo: null },
  ]);
  mocks.mockVerPedido.mockResolvedValue({ id_pedido: 'p-huerfano', detalles: [] });
  renderCocina();
  expect(await screen.findByText(/tardó \d+ min/i)).toBeInTheDocument();
  expect(screen.queryByText(/min en espera/i)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Correr el test para verlo fallar**

Run: `npm test -- CocinaPage` (en `Proyecto-Heladeria-Monitoreo/pos/frontend`)
Expected: FAIL — encuentra `X min en espera` porque `CocinaPage.jsx:44-47` exige `fecha_listo` para decir `tardó`.

- [ ] **Step 3: Implementar congelamiento local**

En `pos/frontend/src/pages/cocina/CocinaPage.jsx`:

3a. Importar `useRef`:
```js
import { useEffect, useRef, useState } from 'react';
```

3b. Añadir tras `const esListo = ...` (línea 34) un registro de primera vista:
```js
// Congelado local (defensa mig 027): si el backend devuelve listo sin
// fecha_listo (dato huérfano), se congela a la primera hora vista para que
// el polling de 15s no lo haga crecer. No usa Date.now() en cada render.
function useCongelados() {
  const ref = useRef(new Map());
  const congelar = (p) => {
    if (!esListo(p)) return 0;
    const srv = fechaListoMs(p);
    if (srv) return srv;
    const id = p.id_pedido;
    if (!ref.current.has(id)) ref.current.set(id, Date.now());
    return ref.current.get(id);
  };
  return congelar;
}
```

3c. Cambiar `minutosEspera` y `textoEspera` a versión con fin inyectado (reemplazar líneas 36-47 por):
```js
const minutosEsperaConFin = (p, finMs) => {
  const ms = horaMs(p);
  if (!ms) return 0;
  const fin = esListo(p) ? (finMs || fechaListoMs(p) || 0) : 0;
  const end = fin || Date.now();
  return Math.max(0, Math.round((end - ms) / 60000));
};

const textoEsperaConFin = (p, finMs) => {
  const espera = minutosEsperaConFin(p, finMs);
  // Listo SIEMPRE dice "tardó", incluso huérfano (fin local). Nunca "en espera".
  return esListo(p) ? `tardó ${espera} min` : `${espera} min en espera`;
};
```

3d. En el componente, instanciar `const congelar = useCongelados();` y usar en los dos lugares donde hoy se llama `minutosEspera/textoEspera`:
- `recargar()` sort (línea 63): ordenar listos por `minutosEsperaConFin` no es necesario; mantener sort por `horaMs`, no tocar.
- Render fila (líneas 152-167): reemplazar
```js
const espera = minutosEspera(p);
```
por
```js
const finCongelado = congelar(p);
const espera = minutosEsperaConFin(p, finCongelado);
```
y `{textoEspera(p)}` por `{textoEsperaConFin(p, finCongelado)}`.

3e. En `recargar()` (líneas 57-87), tras `setPedidos(list)` añadir preservación para que el poll no pise un `fecha_listo` local ya congelado con `null` del servidor:
```js
setPedidos((prev) => {
  const prevById = new Map(prev.map((x) => [x.id_pedido, x]));
  return list.map((p) => {
    const old = prevById.get(p.id_pedido);
    if (old && esListo(p) && !p.fecha_listo && old.fecha_listo) return { ...p, fecha_listo: old.fecha_listo };
    return p;
  });
});
```
Reemplaza el `setPedidos(list)` directo por ese merge. Mantiene actualización optimista + `await recargar()` y `useAutoRefresh` intactos. No cambiar clases, estilos ni `font-family` (respeta tokens).

- [ ] **Step 4: Correr tests frontend**

Run: `npm test -- CocinaPage` (en `Proyecto-Heladeria-Monitoreo/pos/frontend`)
Expected: PASS — los 6 tests existentes + 1 nuevo. El existente `congela el tiempo en listo con fecha_listo` debe seguir pasando.

---

### Task 4: Frontend `CocinaDashboard.jsx` — mismo congelado

**Files:**
- Modify: `pos/frontend/src/pages/dashboard/roles/CocinaDashboard.jsx:1-32`
- Modify: `pos/frontend/src/pages/dashboard/roles/CocinaDashboard.jsx:135-142`

**Interfaces:**
- Consumes: mismas que Task 3 pero en el dashboard (polling propio 10s + optimista).
- Produces: idéntico contrato `tardó` para `listo`.

- [ ] **Step 1: Aplicar el mismo patrón `useCongelados`**

En `CocinaDashboard.jsx`, importar `useRef`:
```js
import { useCallback, useEffect, useRef, useState } from 'react';
```

Reemplazar `minutosEnEspera/textoEspera` (líneas 17-32) por versión con fin inyectado + hook local (misma lógica que Task 3, nombres locales `minutosEnEsperaConFin/textoEsperaConFin/useCongelados`; no exportar).

- [ ] **Step 2: Usar en render y preservar en `recargar`**

En `recargar` (líneas 40-43), cambiar a merge que preserva `fecha_listo` local:
```js
const recargar = useCallback(async () => {
  const data = await listarPedidos();
  const list = Array.isArray(data) ? data : [];
  setPedidos((prev) => {
    const prevById = new Map(prev.map((x) => [x.id_pedido, x]));
    return list.map((p) => {
      const old = prevById.get(p.id_pedido);
      if (old && p.estado === 'listo' && !p.fecha_listo && old.fecha_listo) return { ...p, fecha_listo: old.fecha_listo };
      return p;
    });
  });
}, []);
```

En la fila (línea 136), reemplazar `const min = minutosEnEspera(p);` por cálculo con `congelar(p)` y usar `textoEsperaConFin`. No tocar `Card/Badge/Skeleton`, ni `fontFamily: 'var(--bs-font-serif)'` existente.

- [ ] **Step 3: Correr tests relacionados**

Run: `npm test -- Cocina` (en `Proyecto-Heladeria-Monitoreo/pos/frontend`)
Expected: PASS. Si no hay test de dashboard, basta con que `CocinaPage` siga en verde y `vite build` no rompa (solo si el equipo lo usa; no commitear build).

---

### Task 5: Verificación integrada (criterio de aceptación)

**Files:** ninguno (solo verificación).

- [ ] **Step 1: Verificación backend**

Run: `npm test -- pedido-estado-cocina` (en `pos/posBackend`)
Expected: PASS.

- [ ] **Step 2: Verificación frontend**

Run: `npm test -- CocinaPage` (en `pos/frontend`)
Expected: PASS.

- [ ] **Step 3: Verificación manual en UI (hacer una vez con datos reales)**

1. Abrir Cocina, marcar un pedido `en_preparacion → Listo`.
2. Esperar 1 min (o 2 polls de 15s): el texto debe decir `tardó X min` y `X` no aumenta.
3. Recargar con `F5`: sigue `tardó X min` (backend ya persistió `fecha_listo`).
4. Los 3 pedidos viejos de la captura (`662/643 min en espera`) tras aplicar mig 027 + `GET` auto-repara deben pasar a `tardó N min` congelado (N grande pero fijo).

- [ ] **Step 4: Verificación SQL post-fix**

```sql
SELECT count(*) FROM public.pedido WHERE estado='listo' AND fecha_listo IS NULL;
```
Expected: `0`.

---

## Self-Review

- Cobertura: síntoma (contador crece en listo) → Task 1 fija causa raíz (columna/backfill), Task 2 evita que vuelva a ocurrir (marca + auto-repara), Tasks 3-4 evitan regresión visual aunque el dato llegue huérfano (defensa en profundidad), Task 5 lo hace verificable.
- Sin placeholders: cada paso trae SQL/JSX/comando exacto y salida esperada.
- Consistencia: `fecha_listo` siempre `TIMESTAMPTZ NULL`, `COALESCE(fecha_listo, NOW())` en escritura, `UPDATE ... WHERE listo AND null` en lectura y migración, `tardó` solo para `listo` en ambos frontends.
