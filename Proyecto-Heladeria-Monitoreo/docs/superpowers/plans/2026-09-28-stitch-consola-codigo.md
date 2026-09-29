# Consola Operativa clara 2-colores Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el tema oscuro del frontend Monitoreo por el sistema claro 2-colores de Stitch en las 13 vistas.

**Architecture:** Reescritura solo visual: nuevo `styles.css` claro con tokens, mismos componentes, mismos services y endpoints; cada vista cambia clases y badges sin tocar lógica ni firmas.

**Tech Stack:** React 19.2, react-router-dom 7.9.6, Vite 7.1, CSS puro, backend `/api/v1` + Supabase Auth ya conectados.

**Spec:** `docs/superpowers/specs/2026-09-28-stitch-a-codigo-design.md`

## Global Constraints

- Solo 2 colores: azul industrial `#1E40AF` (acciones, agua, links, nav activo) y amarillo señal `#CA8A04` superficies grandes / `#EAB308` badges pequeños (energía, alertas, avisos); texto sobre amarillo siempre oscuro.
- Neutros: papel `#F8FAFC`, superficies `#FFFFFF`, tinta `#0F172A`, secundario `#475569`, bordes 1px `#E2E8F0`.
- Sin gradientes, sin sombras, sin glow, sin animaciones; radio 4px; Inter (ya en uso, no agregar fuentes).
- Números coma decimal es-BO, tabular-nums, alineados derecha en tablas; foco visible azul 2px; estados por texto + color.
- Español UI; no service-role en React; no cambiar endpoints, Auth ni RBAC.
- IA no ejecuta git add/commit/push (AGENTS.md §10.1); cada tarea termina lista para review del usuario.
- Cada vista: loading/error/empty + responsive + sin `console.error` + `npm run build` ok.

## Review Focus

- Amarillo con texto claro ilegible: todo texto sobre `#EAB308`/`#CA8A04` debe ser oscuro y legible.
- Estado indicado solo por color sin texto: cada badge debe llevar texto (NORMAL/ADVERTENCIA/CRÍTICO/AGUA/ENERGÍA).
- Número con punto decimal o alineado a la izquierda en tablas: debe usar coma decimal y alineación derecha.
- Foco de teclado invisible en el tema claro: debe verse el outline azul 2px.
- Vista que quedó con fondo oscuro residual: ninguna superficie `#16191e`/`#1e242e` debe sobrevivir.

---

### Task 1: styles.css claro + MainLayout + Login

**Files:**
- Modify: `monitoreo/frontend/src/styles.css:1-60` (`:root`, `body`, `.cabecera`, `.sesion`)
- Modify: `monitoreo/frontend/src/styles.css:95-180` (`.tabla`, `.badge*`)
- Modify: `monitoreo/frontend/src/styles.css:176-270` (`.formulario`, botones, `.error`, `.tarjeta`, `.detalle`, `.login-*`)
- Modify: `monitoreo/frontend/src/styles.css:470-488` (bloque sidebar horizontal final)
- Modify: `monitoreo/frontend/src/layouts/MainLayout.jsx:21-56`
- Modify: `monitoreo/frontend/src/views/Login.jsx` (solo redirect ya en `/`; verificar tarjeta clara)

**Interfaces:**
- Consumes: `useAuth()` `{sesion, perfil, orgSeleccionada, setOrgSeleccionada, cerrarSesion}`.
- Produces: clases `.layout .sidebar .main .tabla .badge .agua .energia .critico .advertencia .normal .formulario .tarjeta .detalle .toast .error .cargando .login-*` en tema claro usadas por Tasks 2-6.

- [ ] **Step 1: Reemplazar base por tokens claros**

```css
:root {
  font-family: Inter, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
  color-scheme: light;
}
body {
  margin: 0;
  background: #F8FAFC;
  color: #0F172A;
  font-family: Inter, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
  font-size: 14px;
  line-height: 1.45;
}
```

- [ ] **Step 2: Re-temar sidebar/topbar horizontal claro**

```css
.layout { display: flex; flex-direction: column; min-height: 100vh; }
.sidebar { width: 100%; background: #FFFFFF; border-bottom: 1px solid #E2E8F0; padding: 10px 20px; display: flex; flex-direction: row; flex-wrap: wrap; align-items: center; gap: 8px 16px; }
.sidebar > strong { color: #0F172A; font-size: 15px; margin-right: 8px; }
.sidebar nav { display: flex; flex-direction: row; flex-wrap: wrap; gap: 6px; flex: 1; }
.sidebar a { color: #475569; text-decoration: none; padding: 6px 10px; border-radius: 4px; font-size: 14px; }
.sidebar a:hover { background: #F1F5F9; color: #0F172A; }
.sidebar a.activo { color: #FFFFFF; background: #1E40AF; font-weight: bold; }
```

- [ ] **Step 3: Re-temar tabla, badges, formularios y tarjetas**

```css
.tabla { background: #FFFFFF; border: 1px solid #E2E8F0; color: #0F172A; }
.tabla th { background: #F1F5F9; color: #475569; }
.tabla tbody tr:nth-child(even) { background: #F8FAFC; }
.tabla tbody tr:hover { background: #EFF6FF; }
.tabla td { font-variant-numeric: tabular-nums; text-align: left; }
.tabla td.num { text-align: right; }
.badge.agua { background: #DBEAFE; color: #1E40AF; }
.badge.energia { background: #FEF3C7; color: #92400E; }
.badge.critico { background: #CA8A04; color: #1A1000; }
.badge.advertencia, .badge.alerta { background: #FEF3C7; color: #92400E; }
.badge.normal { background: #DBEAFE; color: #1E40AF; }
.formulario button, .paginacion button, .tabla button, .detalle button { background: #1E40AF; }
```

- [ ] **Step 4: Verificar build**

Run: `npm run build`
Workdir: `monitoreo/frontend`
Expected: PASS, 116+ módulos, sin errores.

- [ ] **Step 5: Dejar listo para review (no commitear, lo hace el usuario)**

### Task 2: Dashboard según Stitch

**Files:**
- Modify: `monitoreo/frontend/src/views/Dashboard.jsx`
- Modify: `monitoreo/frontend/src/services/dashboardService.js` (sin cambios de firma)

**Interfaces:**
- Consumes: `resumen({organizacionId, desde, hasta})` → `{consumo, totalConsumo, alertas}`; clases Task 1.
- Produces: ruta `/` con 4 KPIs + tabla + alertas.

- [ ] **Step 1: 4 KPI cards con datos reales**

```jsx
<div className="tarjetas">
  <div className="tarjeta"><span>Agua hoy (L)</span><strong className="agua">{aguaHoy}</strong><span>{deltaAgua}</span></div>
  <div className="tarjeta"><span>Energía hoy (kWh)</span><strong className="energia">{energiaHoy}</strong><span>{deltaEnergia}</span></div>
  <div className="tarjeta"><span>Alertas abiertas</span><strong>{alertasCriticas}</strong></div>
  <div className="tarjeta"><span>Meta del mes</span><strong>{avanceMeta}%</strong></div>
</div>
```

Agua/energía se calculan filtrando `datos.consumo` por `tipo_recurso` y sumando `cantidad` de hoy; formato coma decimal 2.

- [ ] **Step 2: Tabla recientes + lista alertas con Reconocer**

Tabla con columnas Fecha/Medidor/Cantidad (clase `num`)/Origen; lista de `datos.alertas` con badge de nivel y botón que llama al service de alertas y recarga.

- [ ] **Step 3: Verificar build**

Run: `npm run build`
Workdir: `monitoreo/frontend`
Expected: PASS; abrir `/` con login real y ver 4 KPIs.

### Task 3: Consumo + Medidores re-temados

**Files:**
- Modify: `monitoreo/frontend/src/views/Consumo.jsx` (clases + `num` en cantidad; drawer ya existe)
- Modify: `monitoreo/frontend/src/views/Medidores.jsx` (badge recurso, `code` en código)

- [ ] **Step 1: Cantidad con clase num y coma decimal**

```jsx
<td className="num">{Number(r.cantidad).toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {r.unidad_medida}</td>
```

- [ ] **Step 2: Badge de recurso por tipo**

```jsx
<span className={`badge ${r.tipo_recurso === 'agua' ? 'agua' : 'energia'}`}>{r.tipo_recurso === 'agua' ? 'AGUA' : 'ENERGÍA'}</span>
```

- [ ] **Step 3: Verificar build**

Run: `npm run build`
Expected: PASS; filtros y drawer funcionan igual.

### Task 4: Alertas + Notificaciones + Umbrales

**Files:**
- Modify: `monitoreo/frontend/src/views/Alertas.jsx` (badges NORMAL/ADVERTENCIA/CRÍTICO en mayúsculas)
- Modify: `monitoreo/frontend/src/views/Notificaciones.jsx` (clases claras)
- Modify: `monitoreo/frontend/src/views/Umbrales.jsx` (badge nivel + validación no-solape ya existe)

- [ ] **Step 1: Badge de nivel en mayúsculas con texto**

```jsx
<span className={`badge ${a.nivel}`}>{(a.nivel ?? '').toUpperCase()}</span>
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: PASS; Acusar/Resolver/Reenviar siguen funcionando.

### Task 5: Metas + Tarifas + Recomendaciones + Organizaciones

**Files:**
- Modify: `monitoreo/frontend/src/views/Metas.jsx` (barra progreso con azul, validación 0-100% ya existe)
- Modify: `monitoreo/frontend/src/views/Tarifas.jsx` (calculadora ya existe, clases claras)
- Modify: `monitoreo/frontend/src/views/Recomendaciones.jsx` (botones Aplicar/Descartar)
- Modify: `monitoreo/frontend/src/views/Organizaciones.jsx` (tabla + drawer)

- [ ] **Step 1: Barra de progreso de meta en azul plano**

```jsx
<div className="progreso"><div className="progreso-barra" style={{ width: `${pct}%` }} /></div>
```

```css
.progreso { background: #E2E8F0; border-radius: 4px; height: 8px; }
.progreso-barra { background: #1E40AF; height: 8px; border-radius: 4px; }
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: PASS.

### Task 6: Reportes + Auditoría + QA final

**Files:**
- Modify: `monitoreo/frontend/src/views/Reportes.jsx` (botones CSV/Print ya existen)
- Modify: `monitoreo/frontend/src/views/Auditoria.jsx` (tabla clara solo lectura)

- [ ] **Step 1: QA flujo completo con login real**

Abrir `npm run dev`, verificar `/ → /consumo → /alertas → /reportes`, export CSV descarga, sin `console.error`, responsive 1280px y 390px.

- [ ] **Step 2: Build final**

Run: `npm run build`
Workdir: `monitoreo/frontend`
Expected: PASS.

- [ ] **Step 3: Dejar listo para review (no commitear, lo hace el usuario)**

## Self-Review

- Spec coverage: tokens §3 Task 1, layout/vistas §4 Tasks 1-6, sin cambios §5 (ninguna tarea toca services salvo Dashboard que mantiene firma), QA §6 Task 6.
- Placeholder scan: sin TBD/TODO, código concreto en cada paso, comandos exactos.
- Type consistency: `organizacionId` string, `cantidad` NUMERIC con coma decimal, clases `badge agua/energia/critico/advertencia/normal` iguales en todas las tareas.
- Review Focus: cada línea tiene su verificación en la tarea dueña (texto oscuro sobre amarillo en Task 1, badges con texto en Task 4, coma decimal en Task 3, foco en Task 1, sin fondos oscuros en Task 6 QA).
