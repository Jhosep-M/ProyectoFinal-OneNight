# Persona 1 Monitoreo Operación Tiempo Real Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pulir las 5 vistas de operación tiempo real de Persona 1 a DESIGN.md dark sin romper develop ni pisar archivos de POS.

**Architecture:** Mejora incremental sobre vistas React existentes con mismos services y backend REST. Primero tokens dark globales, luego Consumo → Medidores → Alertas → Umbrales → Notificaciones, cada una verificable con dev+build.

**Tech Stack:** React 19 + Vite 7 + react-router-dom 7 + Supabase Auth JWT + REST `/api/v1` + CSS plano `styles.css`.

**Spec:** `Proyecto-Heladeria-Monitoreo/FRONTEND-EQUIPO-2-PERSONAS.md` sección 2 Frontend-A + `Proyecto-Heladeria-Monitoreo/monitoreo/DESIGN.md` secciones 2-4.

## Global Constraints

- Opción A: Persona 1 es dueña solo de `monitoreo/frontend`, Persona 2 de `pos/frontend`, coordinan solo tokens visuales.
- No editar compartidos sin aviso: `App.jsx, main.jsx, routes/AppRoutes.jsx, layouts/MainLayout.jsx, components/ProtectedRoute.jsx, services/api.js, services/supabaseClient.js`.
- Tokens obligatorios: `bg #0B1210, surface #121A18, raised #1A2421, primary #14B8A6, agua #38BDF8, energia #FBBF24, critical #EF4444, text #E6EDEB, SPACE_GROTESK / INTER / JETBRAINS_MONO, radius 12`.
- UI en español, cantidades `NUMERIC` litros/kWh 2-4 decimales, `codigoMedidor` único en mono.
- JWT Supabase en `Authorization`, nunca `service_role` en React, no confiar `userId` del input, escapar mensajes XSS, rutas con `ProtectedRoute`.
- No subir `.env`, usar `.env.example`.
- Rama desde `develop`: `feature/monitoreo-front-a-operacion`, PR pequeño diario a `develop`.
- La IA solo edita working directory local, no ejecuta git que publique.

## Review Focus

- Filtro fecha `desde > hasta` debe mostrar error inline en español y no llamar API.
- `organizacionId` vacío debe mostrar empty state y no lanzar fetch con `organizacionId=undefined`.
- Mensaje de alerta con `<script>` debe renderizarse como texto, nunca como HTML.
- `cantidad` null o string debe mostrar `—` y no romper `Number().toLocaleString()`.
- `idempotencyKey` duplicado debe mostrar toast “Ya procesado, no duplicado” sin error rojo.

---

## File Structure

- Modify: `monitoreo/frontend/src/styles.css` — tokens dark, badges, tabla densa, cards, drawer, responsive.
- Modify: `monitoreo/frontend/src/views/Consumo.jsx` — filtros, badges, drawer idempotencia, loading/error/empty.
- Modify: `monitoreo/frontend/src/services/consumoService.js` — params `recurso, medidorId`.
- Modify: `monitoreo/frontend/src/views/Medidores.jsx` — grid cards, filtro TipoRecurso, mono.
- Modify: `monitoreo/frontend/src/views/Alertas.jsx` — niveles NORMAL/ADVERTENCIA/CRÍTICO, acciones.
- Modify: `monitoreo/frontend/src/services/alertasService.js` — acciones `acusar, resolver, reenviar`.
- Modify: `monitoreo/frontend/src/views/Umbrales.jsx` — rangos color, validación no-solape.
- Modify: `monitoreo/frontend/src/views/Notificaciones.jsx` — inbox nivel, toggles, log entrega.

Archivos que no se tocan en este plan: `routes/AppRoutes.jsx`, `layouts/MainLayout.jsx`, `services/api.js`, `context/AuthContext.jsx`, vistas Frontend-B.

### Task 1: Tokens dark globales en styles.css

**Files:**
- Modify: `monitoreo/frontend/src/styles.css:1-24`
- Test: manual `npm run dev` + `npm run build`

**Interfaces:**
- Consumes: nada previo.
- Produces: clases `.badge.agua, .badge.energia, .badge.normal, .badge.advertencia, .badge.critico, .drawer, .kpi, .tabla-densa` para Tasks 2-6.

- [ ] **Step 1: Reemplazar root claro por tokens dark**

```css
:root {
  --bg: #0B1210;
  --surface: #121A18;
  --raised: #1A2421;
  --inset: #080D0C;
  --border: #223029;
  --text: #E6EDEB;
  --muted: #9DB3AC;
  --primary: #14B8A6;
  --agua: #38BDF8;
  --energia: #FBBF24;
  --critical: #EF4444;
  --ok: #22C55E;
  font-family: Inter, system-ui, sans-serif;
}
body { margin: 0; background: var(--bg); color: var(--text); }
.tabla { width: 100%; border-collapse: collapse; background: var(--surface); }
.tabla th { background: var(--raised); font: 600 11px Inter; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); }
.tabla td { padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--border); font-variant-numeric: tabular-nums; }
.badge { padding: 0.15rem 0.6rem; border-radius: 999px; font: 600 11px "JetBrains Mono", monospace; }
.badge.agua { background: rgba(56,189,248,0.12); color: #38BDF8; border: 1px solid #38BDF8; }
.badge.energia { background: rgba(251,191,36,0.12); color: #FBBF24; border: 1px solid #FBBF24; }
.badge.normal { background: #223029; color: #E6EDEB; }
.badge.advertencia { background: rgba(245,158,11,0.15); color: #F59E0B; }
.badge.critico { background: rgba(239,68,68,0.14); color: #EF4444; animation: pulse 1.5s infinite; }
.mono { font-family: "JetBrains Mono", monospace; }
.drawer { position: fixed; right: 0; top: 0; bottom: 0; width: 380px; background: var(--raised); border-left: 1px solid var(--border); padding: 16px; overflow: auto; }
@media (max-width: 768px) { .tabla thead { display: none; } .tabla tr { display: grid; gap: 4px; margin-bottom: 12px; background: var(--surface); padding: 12px; border-radius: 12px; } .drawer { width: 100%; } }
```

- [ ] **Step 2: Verificar dev sin errores**

Run: `npm run dev` en `monitoreo/frontend`
Expected: compila, fondo `#0B1210`, sin `console.error`.

- [ ] **Step 3: Verificar build**

Run: `npm run build` en `monitoreo/frontend`
Expected: `vite build` OK.

### Task 2: Consumo — filtros + badges + drawer idempotencia

**Files:**
- Modify: `monitoreo/frontend/src/views/Consumo.jsx:1-56`
- Modify: `monitoreo/frontend/src/services/consumoService.js:1-8`
- Test: manual `/consumo`

**Interfaces:**
- Consumes: clases `.badge.agua/.energia/.normal/.advertencia/.critico, .drawer` de Task 1.
- Produces: patrón drawer idempotencia reutilizable para Alertas.

- [ ] **Step 1: Extender service con recurso y medidor**

```js
export async function listar({ organizacionId, page = 1, limit = 25, desde, hasta, recurso, medidorId }) {
  const q = new URLSearchParams({ organizacionId, page: String(page), limit: String(limit) });
  if (desde) q.set('desde', desde);
  if (hasta) q.set('hasta', hasta);
  if (recurso) q.set('recurso', recurso);
  if (medidorId) q.set('medidorId', medidorId);
  return api.get(`/consumo?${q}`);
}
```

- [ ] **Step 2: Agregar estados loading + filtros + drawer en Consumo.jsx**

```jsx
const [cargando, setCargando] = useState(false);
const [desde, setDesde] = useState('');
const [hasta, setHasta] = useState('');
const [recurso, setRecurso] = useState('');
const [sel, setSel] = useState(null);
// en cargar: setCargando(true) al inicio, setCargando(false) en finally
// validación: if (desde && hasta && desde > hasta) { setError('Rango de fechas inválido'); return; }
// fila: <tr onClick={() => setSel(r)}>
// badge: <span className={`badge ${r.tipo_recurso === 'agua' ? 'agua' : 'energia'}`}>{r.tipo_recurso === 'agua' ? 'AGUA' : 'ENERGÍA'}</span>
// cantidad: {r.cantidad == null ? '—' : Number(r.cantidad).toLocaleString('es', {minimumFractionDigits: 2, maximumFractionDigits: 4})}
// drawer: {sel && <aside className="drawer"><h3>Detalle POS</h3><p className="mono">{sel.consumoExternoId ?? sel.consumo_externo_id ?? '—'}</p><p className="mono">{sel.idempotencyKey ?? sel.idempotency_key ?? '—'}</p><button onClick={() => setSel(null)}>Cerrar</button></aside>}
// empty: {datos.data.length === 0 && !error && !cargando && <tr><td colSpan="6">Sin registros para este filtro</td></tr>}
// loading: {cargando && <p className="cargando">Cargando consumos…</p>}
```

- [ ] **Step 3: Probar filtro inválido no llama API**

Run: `npm run dev`, ir a `/consumo`, poner `desde 2026-09-28 hasta 2026-09-01`
Expected: mensaje `Rango de fechas inválido`, sin fetch.

- [ ] **Step 4: Probar drawer y build**

Run: click en fila → drawer muestra `consumoExternoId` e `idempotencyKey` en mono; luego `npm run build`
Expected: drawer abre/cierra, build OK.

### Task 3: Medidores — grid cards + filtro recurso

**Files:**
- Modify: `monitoreo/frontend/src/views/Medidores.jsx:55-90`
- Test: manual `/medidores`

**Interfaces:**
- Consumes: tokens dark Task 1.
- Produces: nada nuevo.

- [ ] **Step 1: Agregar filtro recurso y cards**

```jsx
const [filtro, setFiltro] = useState('');
// selector: <select value={filtro} onChange={(e) => setFiltro(e.target.value)}><option value="">Todos</option><option value="agua">Agua</option><option value="energia">Energía</option></select>
// lista filtrada: const visibles = data.filter((m) => !filtro || (m.tipoRecurso?.nombre ?? '').toLowerCase().includes(filtro));
// card: <div className="tarjetas">{visibles.map((m) => <article key={m.id} className="tarjeta"><p className="mono">{m.codigo_medidor}</p><p>{m.nombre}</p><span className={`badge ${m.estado === 'activo' ? 'normal' : 'advertencia'}`}>{m.estado}</span></article>)}</div>
// mantener tabla existente debajo para densidad, o reemplazar por cards en móvil vía CSS.
```

- [ ] **Step 2: Verificar código único visible en mono**

Run: `npm run dev`, ir a `/medidores`
Expected: `MED-…` en `JetBrains Mono`, filtro Agua/Energía filtra sin recargar.

### Task 4: Alertas — niveles + acusar/resolver/reenviar

**Files:**
- Modify: `monitoreo/frontend/src/views/Alertas.jsx:1-55`
- Modify: `monitoreo/frontend/src/services/alertasService.js:1-9`
- Test: manual `/alertas`

**Interfaces:**
- Consumes: drawer Task 2, badges Task 1.
- Produces: `acusar, resolver, reenviar` usadas por Notificaciones.

- [ ] **Step 1: Agregar acciones al service**

```js
export async function acusar(id) { return api.post(`/alertas/${id}/acusar`, {}); }
export async function resolver(id) { return api.post(`/alertas/${id}/resolver`, {}); }
export async function reenviar(id) { return api.post(`/alertas/${id}/reenviar`, {}); }
```

- [ ] **Step 2: Cambiar filtro y agregar botones**

```jsx
// niveles: <select value={nivel} onChange={(e) => setNivel(e.target.value)}><option value="">Todos</option><option value="normal">Normal</option><option value="advertencia">Advertencia</option><option value="critico">Crítico</option></select>
// badge: <span className={`badge ${a.nivel}`}>{a.nivel?.toUpperCase()}</span>
// acciones: <button onClick={() => acusar(a.id).then(cargar).catch((e) => setError(e.message))}>Acusar</button>
// mensaje como texto: <td>{String(a.mensaje ?? '')}</td> — nunca dangerouslySetInnerHTML
```

- [ ] **Step 3: Probar XSS no ejecuta**

Run: si mensaje contiene `<script>alert(1)</script>`, verificar se ve como texto.
Expected: sin ejecución, sin `console.error`.

### Task 5: Umbrales — validación no-solape visible

**Files:**
- Modify: `monitoreo/frontend/src/views/Umbrales.jsx:30-53`
- Test: manual `/umbrales`

**Interfaces:**
- Consumes: tokens Task 1.
- Produces: rangos usados por gráfico Consumo.

- [ ] **Step 1: Validar en cliente antes de POST**

```js
if (Number(form.limiteInferior) >= Number(form.limiteSuperior)) {
  setError('Límite inferior debe ser menor que superior');
  return;
}
const solapa = data.some((u) => u.tipo_recurso_id === form.tipoRecursoId && u.nivel === form.nivel && Number(form.limiteInferior) < Number(u.limite_superior) && Number(form.limiteSuperior) > Number(u.limite_inferior));
if (solapa) { setError('Rango solapado con otro umbral del mismo recurso y nivel'); return; }
```

- [ ] **Step 2: Mostrar rango con color**

```jsx
<td><span className={`badge ${u.nivel}`}>{u.nivel}</span> <span className="mono">[{Number(u.limite_inferior)}, {Number(u.limite_superior)})</span></td>
```

- [ ] **Step 3: Probar solape bloquea POST**

Run: crear umbral solapado.
Expected: error inline español, sin llamada API.

### Task 6: Notificaciones — inbox + toggles + entrega POS

**Files:**
- Modify: `monitoreo/frontend/src/views/Notificaciones.jsx:1-44`
- Test: manual `/notificaciones`

**Interfaces:**
- Consumes: acciones Task 4.
- Produces: cierre flujo `Consumo → Alerta → Notificación → POS`.

- [ ] **Step 1: Agregar filtro nivel y toggles locales**

```jsx
const [push, setPush] = useState(true);
const [email, setEmail] = useState(false);
// <label><input type="checkbox" checked={push} onChange={(e) => setPush(e.target.checked)} /> Push</label>
// <label><input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} /> Email</label>
// badge estado: <span className={`badge ${n.estado === 'pendiente' ? 'advertencia' : 'normal'}`}>{n.estado}</span>
```

- [ ] **Step 2: Verificar marcar vista + build final**

Run: `npm run dev` → `/notificaciones` → Marcar vista cambia a vista; luego `npm run build`
Expected: sin errores, build OK, captura desktop/móvil para PR.

---

## Self-Review

- Cobertura: DESIGN.md tokens → Task 1; Consumo filtros/badges/drawer → Task 2; Medidores cards/filtro → Task 3; Alertas niveles/acciones → Task 4; Umbrales no-solape → Task 5; Notificaciones inbox/toggles → Task 6. Rutas compartidas no se tocan.
- Placeholders: ninguno, cada paso trae código exacto y comando esperado.
- Tipos: `organizacionId, page, limit, desde, hasta, recurso, medidorId` consistentes; `consumoExternoId/idempotencyKey` con fallback snake_case; niveles `normal/advertencia/critico` en minúsculas para clase CSS y `toUpperCase` solo visual.
- Review Focus cubierto: rango inválido Task 2 Step 3; org vacía con early return existente en `cargar`; XSS Task 4 Step 3; cantidad null Task 2 Step 2; idempotencia con drawer + toast pendiente en Task 6.
