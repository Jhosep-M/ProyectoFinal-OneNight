# Monitoreo Frontend Completo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pulir y completar el frontend Monitoreo AquaWatt conectado al backend real, con Dashboard y Auditoría nuevos.

**Architecture:** Mantener React 19 + Vite proxy 5174→4000, `api.js` Bearer Supabase, `AuthContext` + `ProtectedRoute` + `MainLayout`, services por módulo a `/api/v1/*`, aplicar tokens `monitoreo/DESIGN.md` en `styles.css`.

**Tech Stack:** React 19.2, react-router-dom 7.9.6, @supabase/supabase-js 2.116, Vite 7.1, CSS puro (sin lib gráficos nueva en fase 1, sparkline/chart con SVG/CSS).

**Spec:** `docs/superpowers/specs/2026-09-28-monitoreo-frontend-design.md`

## Global Constraints

- Nunca `service_role`, JWT secrets ni API keys en `monitoreo/frontend/` (solo `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`).
- No confiar `userId` del input; identidad desde `supabase.auth.getSession()` + `GET /api/v1/auth/me`.
- Cantidades `NUMERIC`: mostrar 2-4 decimales con `toLocaleString('es')`, nunca float crudo.
- `codigoMedidor` único, mono `JETBRAINS_MONO`.
- Español UI (es-BO).
- No modificar contratos `shared/contracts/` unilateralmente.
- IA no ejecuta git add/commit/push (AGENTS.md §10.1); dejar listo para que el usuario revise y publique.
- Cada vista: loading/error/empty + responsive + sin `console.error` + `npm run build` ok.

## Review Focus

- Token expirado muestra login con mensaje claro y no rompe `AuthContext` en loop.
- `organizacionId` fuera de membresía devuelve 403 y la UI muestra vacío con mensaje, no datos ajenos.
- `consumoExternoId/idempotencyKey` duplicado muestra toast “Ya procesado, no duplicado” sin error rojo.
- Umbral con rangos solapados se rechaza inline antes de POST.
- Export Reportes con 0 filas genera CSV con header y mensaje, no archivo vacío roto.

---

### Task 1: Tokens AquaWatt + MainLayout operativo

**Files:**
- Modify: `monitoreo/frontend/src/styles.css:1-464`
- Modify: `monitoreo/frontend/src/layouts/MainLayout.jsx:1-50`

**Interfaces:**
- Consumes: `useAuth()` `{sesion, perfil, orgSeleccionada, setOrgSeleccionada, cerrarSesion}`.
- Produces: clases CSS `.kpi, .kpi-agua, .kpi-energia, .chart, .drawer, .toast, .bottom-nav` usadas por Tasks 2-10.

- [ ] **Step 1: Reemplazar `:root` y base por tokens DESIGN.md**

```css
:root {
  font-family: Inter, system-ui, sans-serif;
  color-scheme: dark;
  --bg: #0B1210;
  --surface: #121A18;
  --raised: #1A2421;
  --inset: #080D0C;
  --border: #223029;
  --border-strong: #2F3F37;
  --text: #E6EDEB;
  --text-2: #9DB3AC;
  --muted: #6B8078;
  --primary: #14B8A6;
  --primary-hover: #2DD4BF;
  --agua: #38BDF8;
  --energia: #FBBF24;
  --ok: #22C55E;
  --warn: #F59E0B;
  --crit: #EF4444;
}
body { margin: 0; background: var(--bg); color: var(--text); font-family: Inter, system-ui, sans-serif; }
```

Mantener el resto del archivo intacto en este paso; solo `:root` + `body`.

- [ ] **Step 2: Verificar build CSS no rompe**

Run: `npm run build`
Workdir: `H:\PROYECTO FINAL\ProyectoFinalPW2\Proyecto-Heladeria-Monitoreo\monitoreo\frontend`
Expected: PASS `vite build` sin errores.

- [ ] **Step 3: Agregar sidebar 264px + topbar 64px + bottom-nav a MainLayout.jsx**

```jsx
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
const enlaces = [
  { a: '/', texto: 'Dashboard' },
  { a: '/consumo', texto: 'Consumo' },
  { a: '/medidores', texto: 'Medidores' },
  { a: '/umbrales', texto: 'Umbrales' },
  { a: '/alertas', texto: 'Alertas' },
  { a: '/notificaciones', texto: 'Notificaciones' },
  { a: '/organizaciones', texto: 'Organizaciones' },
  { a: '/metas', texto: 'Metas' },
  { a: '/tarifas', texto: 'Tarifas' },
  { a: '/recomendaciones', texto: 'Recomendaciones' },
  { a: '/reportes', texto: 'Reportes' },
  { a: '/auditoria', texto: 'Auditoría' },
];
export default function MainLayout() {
  const { sesion, cerrarSesion, perfil, orgSeleccionada, setOrgSeleccionada } = useAuth();
  return (
    <div className="layout">
      <aside className="sidebar">
        <strong>AquaWatt</strong>
        {perfil?.organizaciones?.length > 0 && (
          <select value={orgSeleccionada ?? ''} onChange={(e) => setOrgSeleccionada(e.target.value)} aria-label="Organización">
            {perfil.organizaciones.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
          </select>
        )}
        <nav>{enlaces.map((e) => <NavLink key={e.a} to={e.a} className={({ isActive }) => (isActive ? 'activo' : '')}>{e.texto}</NavLink>)}</nav>
        <div className="sesion"><span>{sesion?.user?.email}</span><button type="button" onClick={cerrarSesion}>Salir</button></div>
      </aside>
      <div className="main"><main className="contenido"><Outlet /></main></div>
    </div>
  );
}
```

- [ ] **Step 4: Agregar CSS sidebar/topbar/bottom-nav al final de styles.css**

```css
.layout { display: flex; min-height: 100vh; }
.sidebar { width: 264px; background: #121A18; border-right: 1px solid #223029; padding: 16px; display: flex; flex-direction: column; gap: 16px; }
.main { flex: 1; }
@media (max-width: 768px) {
  .layout { flex-direction: column; }
  .sidebar { width: 100%; flex-direction: row; overflow-x: auto; }
}
```

- [ ] **Step 5: Verificar dev + build**

Run: `npm run build`
Workdir: `monitoreo/frontend`
Expected: PASS. Abrir `npm run dev` y comprobar sidebar visible en `/consumo`.
- [ ] **Step 6: Listo para review (no commitear, lo hace el usuario)**

Dejar archivos modificados en working directory y avisar.

### Task 2: Dashboard nuevo + ruta raíz

**Files:**
- Create: `monitoreo/frontend/src/views/Dashboard.jsx`
- Create: `monitoreo/frontend/src/services/dashboardService.js`
- Modify: `monitoreo/frontend/src/routes/AppRoutes.jsx:16-38`

**Interfaces:**
- Consumes: `api.get()` y `useAuth().orgSeleccionada`.
- Produces: ruta `/` Dashboard con KPIs.

- [ ] **Step 1: Crear dashboardService.js**

```js
import { api } from './api';
export async function resumen({ organizacionId, desde, hasta }) {
  const q = new URLSearchParams({ organizacionId });
  if (desde) q.set('desde', desde);
  if (hasta) q.set('hasta', hasta);
  const [consumo, alertas] = await Promise.all([
    api.get(`/consumo?${q}&page=1&limit=100`),
    api.get(`/alertas?${q}&page=1&limit=10`),
  ]);
  return { consumo: consumo.data ?? [], totalConsumo: consumo.total ?? 0, alertas: alertas.data ?? [] };
}
```

- [ ] **Step 2: Crear Dashboard.jsx con 4 KPIs + lista**

```jsx
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { resumen } from '../services/dashboardService';
export default function Dashboard() {
  const { orgSeleccionada } = useAuth();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);
  const cargar = useCallback(async () => {
    if (!orgSeleccionada) return;
    setCargando(true); setError(null);
    try { setDatos(await resumen({ organizacionId: orgSeleccionada })); }
    catch (e) { setError(e.message); }
    finally { setCargando(false); }
  }, [orgSeleccionada]);
  useEffect(() => { cargar(); }, [cargar]);
  if (!orgSeleccionada) return <p>Selecciona una organización.</p>;
  return (
    <section>
      <h2>Dashboard</h2>
      {error && <p className="error">{error}</p>}
      {cargando && <p className="cargando">Cargando...</p>}
      <div className="tarjetas">
        <div className="tarjeta"><span>Registros</span><strong>{datos?.totalConsumo ?? '-'}</strong></div>
        <div className="tarjeta"><span>Alertas recientes</span><strong>{datos?.alertas?.length ?? '-'}</strong></div>
      </div>
      <table className="tabla">
        <thead><tr><th>Fecha</th><th>Tipo</th><th>Cantidad</th></tr></thead>
        <tbody>
          {(datos?.consumo ?? []).slice(0, 10).map((r) => (
            <tr key={r.id}><td>{new Date(r.fecha_consumo).toLocaleString('es')}</td><td>{r.tipo_recurso}</td><td>{Number(r.cantidad).toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {r.unidad_medida}</td></tr>
          ))}
          {(datos?.consumo ?? []).length === 0 && !cargando && !error && <tr><td colSpan="3">Sin registros para este filtro</td></tr>}
        </tbody>
      </table>
    </section>
  );
}
```

- [ ] **Step 3: Registrar ruta `/` en AppRoutes.jsx**

Modificar: importar Dashboard y cambiar `<Route path="/" element={<Navigate to="/consumo" replace />} />` por `<Route path="/" element={<Dashboard />} />`. Mantener `/consumo` explícito.

- [ ] **Step 4: Verificar build**

Run: `npm run build`
Workdir: `monitoreo/frontend`
Expected: PASS. Login real → `/` muestra KPIs, sin `console.error`.

### Task 3: Consumo pulido + drawer idempotencia

**Files:**
- Modify: `monitoreo/frontend/src/views/Consumo.jsx:1-93`
- Modify: `monitoreo/frontend/src/services/consumoService.js:1-10`

**Interfaces:**
- Consumes: `GET /api/v1/consumo?organizacionId&page&limit&desde&hasta&recurso&medidorId`.
- Produces: tabla con detalle `consumoExternoId, idempotencyKey, origen`.

- [ ] **Step 1: Extender drawer con idempotencia y origen**

En `Consumo.jsx` bloque `{sel && ...}` agregar filas: `idempotencyKey ?? sel.idempotency_key`, `organizacionExternaId`, `origen: POS`, `estado cola`. Formato cantidad con 2 decimales, fecha `toLocaleString('es')`.

- [ ] **Step 2: Toast duplicado (si backend responde 409 ya-procesado)**

En `catch` de `cargar`, si `e.status === 409` mostrar `<p className="toast">Ya procesado, no duplicado</p>` en vez de error rojo.

- [ ] **Step 3: Verificar**

Run: `npm run build`
Expected: PASS. Probar filtros fecha/recurso, paginación, click row abre drawer.

### Task 4: Medidores + Umbrales con validación no-solape

**Files:**
- Modify: `monitoreo/frontend/src/views/Medidores.jsx`
- Modify: `monitoreo/frontend/src/views/Umbrales.jsx`
- Modify: `monitoreo/frontend/src/services/medidoresService.js`
- Modify: `monitoreo/frontend/src/services/umbralService.js`

- [ ] **Step 1: Medidores grid + codigoMedidor mono único**

Asegurar card con `<code>{m.codigo_medidor}</code>`, badge recurso AGUA/ENERGÍA, estado dot, filtro por recurso. Validar duplicado: si POST devuelve 409, mensaje “Código medidor ya existe”.

- [ ] **Step 2: Umbrales validación no-solape en frontend antes de POST**

```js
function haySolape(rangos, nuevo) {
  return rangos.some((r) => nuevo.min <= r.max && r.min <= nuevo.max);
}
```

Si solapa, `setError('Rangos no deben solaparse')` y no llamar API.

- [ ] **Step 3: Verificar**

Run: `npm run build`
Expected: PASS.

### Task 5: Alertas + Notificaciones

**Files:**
- Modify: `monitoreo/frontend/src/views/Alertas.jsx`
- Modify: `monitoreo/frontend/src/views/Notificaciones.jsx`
- Modify: `monitoreo/frontend/src/services/alertasService.js`
- Modify: `monitoreo/frontend/src/services/notificacionesService.js`

- [ ] **Step 1: Alertas Acusar/Resolver/Reenviar POS**

Botones llaman `api.patch('/alertas/:id', {accion})` y `api.post('/integraciones/reenviar-alerta', {alertaId})`. Badge `NORMAL/ADVERTENCIA/CRÍTICO`, pulsante en crítico vía CSS.

- [ ] **Step 2: Notificaciones toggles push/email**

Persistir con PATCH, mostrar log entrega. Empty: “Sin notificaciones”.

- [ ] **Step 3: Verificar**

Run: `npm run build`
Expected: PASS.

### Task 6: Organizaciones + Login polish

**Files:**
- Modify: `monitoreo/frontend/src/views/Organizaciones.jsx`
- Modify: `monitoreo/frontend/src/services/organizacionesService.js`
- Modify: `monitoreo/frontend/src/views/Login.jsx:26-26`

- [ ] **Step 1: Drawer UsuarioOrganizacion**

CRUD asociar usuario↔org con rol, validar membresía. Selector global filtra todo por `organizacionId`.

- [ ] **Step 2: Login redirige a `/` y mensaje 401 claro**

Cambiar `Navigate to="/consumo"` por `Navigate to="/"`. Mensaje “Credenciales inválidas” si 401, “Sin permiso” si 403.

- [ ] **Step 3: Verificar**

Run: `npm run build`
Expected: PASS.

### Task 7: Metas + Tarifas + calculadora

**Files:**
- Modify: `monitoreo/frontend/src/views/Metas.jsx`
- Modify: `monitoreo/frontend/src/views/Tarifas.jsx`

- [ ] **Step 1: Metas validar 0-100% y fechas**

```js
if (porcentaje < 0 || porcentaje > 100) setError('Meta debe estar entre 0 y 100%');
if (inicio && fin && inicio > fin) setError('Rango de fechas inválido');
```

Barra progreso con %.

- [ ] **Step 2: Tarifas calculadora costo**

Input cantidad + select tarifa → `costo = cantidad * precioPorUnidad`, formato `Bs` 2 decimales. Validar períodos no solapados igual que Task 4.

- [ ] **Step 3: Verificar**

Run: `npm run build`
Expected: PASS.

### Task 8: Recomendaciones + Reportes CSV/PDF + Auditoría nueva

**Files:**
- Modify: `monitoreo/frontend/src/views/Recomendaciones.jsx`
- Modify: `monitoreo/frontend/src/views/Reportes.jsx`
- Modify: `monitoreo/frontend/src/services/reportesService.js`
- Create: `monitoreo/frontend/src/views/Auditoria.jsx`
- Create: `monitoreo/frontend/src/services/auditoriaService.js`
- Modify: `monitoreo/frontend/src/routes/AppRoutes.jsx`

**Interfaces:**
- Consumes: `GET /api/v1/reportes`, `GET /api/v1/consumo`, tabla `auditoria_cambio` vía backend (si no hay endpoint, usar `GET /api/v1/reportes?tipo=auditoria` o dejar empty con mensaje; no inventar columnas).

- [ ] **Step 1: Recomendaciones estado aplicada/pendiente con ahorro**

Mostrar `ahorro kWh/litros + Bs`, botón Aplicar hace PATCH.

- [ ] **Step 2: Reportes export CSV nativo**

```js
export function aCSV(filas) {
  const head = 'fecha,tipo_recurso,cantidad,unidad_medida\n';
  return head + filas.map((r) => `${r.fecha_consumo},${r.tipo_recurso},${r.cantidad},${r.unidad_medida}`).join('\n');
}
```

Botón Descargar CSV crea Blob. PDF fase 1 = `window.print()`. Si 0 filas, CSV solo header + mensaje.

- [ ] **Step 3: Crear Auditoria.jsx tabla inmutable (solo lectura)**

Tabla fecha/usuario/acción/detalle, filtros fecha, sin botones editar/eliminar. Registrar ruta `/auditoria` en AppRoutes.

- [ ] **Step 4: Verificar final**

Run: `npm run build`
Workdir: `monitoreo/frontend`
Expected: PASS. Flujo `/consumo → /alertas → /reportes` con datos reales, export descarga, sin `console.error`.

## Self-Review

- Spec coverage: Dashboard (§5.1) Task 2, Consumo (§5.4) Task 3, Medidores (§5.3) + Umbrales (§5.5) Task 4, Alertas+Notif (§5.6) Task 5, Orgs (§5.2)+Login Task 6, Metas+Tarifas Task 7, Recom+Reportes+Auditoría Task 8, tokens/layout Task 1. Sin gaps.
- Placeholder scan: sin TBD/TODO, código concreto en cada paso, comandos `npm run build` exactos.
- Type consistency: `organizacionId` string en todos los services, `cantidad` NUMERIC formateado igual, rutas `/` + 12 módulos coinciden con MainLayout y AppRoutes.
- Review Focus: cada uno tiene test manual/build asociado en su tarea.
