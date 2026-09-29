# DESIGN.md — Monitoreo Agua y Energía (Heladería / Cafetería)

> Alcance: SOLO módulo Monitoreo. No incluye POS. Optimizado para Stitch `upload_design_md` → `create_design_system_from_design_md`.

## 1. Resumen producto

Sistema de monitoreo de consumo de agua y energía para cadena de heladerías. Operadores y supervisores supervisan organizaciones, puntos de medición (medidores), consumos recibidos del POS vía `POST /api/v1/integrations/consumption`, clasificación por umbrales, alertas, metas de reducción, tarifas, recomendaciones y reportes.

Marca: **AquaWatt Monitoreo** — tono técnico, confiable, sostenible. Idioma UI: español (es-BO).
Usuarios: `admin`, `supervisor`, `operador`. Multi-organización con aislamiento por `organizacion`.

Personalidad visual: Dark Ops Console. Denso en datos de día, legible de noche. Nada lúdico. Prioridad: distinguir de un vistazo `agua` vs `energia` y `normal` vs `advertencia` vs `critico`.

## 2. Design tokens para Stitch

Sugerencia directa para `create_design_system`:

- `colorMode: DARK`
- `customColor: #14B8A6` (teal primario)
- `headlineFont: SPACE_GROTESK`
- `bodyFont: INTER`
- `labelFont: JETBRAINS_MONO` (métricas, códigos medidor, idempotency keys)
- `roundness: ROUND_TWELVE` (12px cards, 8px inputs/chips)
- `colorVariant: TONAL_SPOT`

### Paleta

Fondos dark:
- `bg.base: #0B1210` — fondo app
- `bg.surface: #121A18` — cards, sidebar
- `bg.raised: #1A2421` — modales, dropdowns, tablas header
- `bg.inset: #080D0C` — gráficos, inputs
- `border.subtle: #223029` (1px), `border.strong: #2F3F37`

Texto:
- `text.primary: #E6EDEB`
- `text.secondary: #9DB3AC`
- `text.muted: #6B8078`
- `text.inverse: #0B1210`

Primario / acción:
- `primary: #14B8A6` (teal), `primary.hover: #2DD4BF`, `primary.pressed: #0D9488`, `on-primary: #04211D`

Recursos (nunca intercambiar):
- `agua: #38BDF8` (sky), `agua.bg: rgba(56,189,248,0.12)`
- `energia: #FBBF24` (amber), `energia.bg: rgba(251,191,36,0.12)`

Semántica alertas:
- `ok: #22C55E`, `info: #38BDF8`, `warning: #F59E0B`, `critical: #EF4444`, `critical.bg: rgba(239,68,68,0.14)`
- No usar verde para otro significado que “ok”.

Gráficos (líneas/áreas):
- Agua serie: `#38BDF8`, Energía serie: `#FBBF24`, Meta: `#22C55E` dashed, Umbral: `#EF4444` dashed.

### Tipografía

- Display / headline: `Space Grotesk 600` — 28/32 Dashboard, 22/28 sección, 18/24 card title.
- Body: `Inter 400/500` — 14/20 base, 13/18 tablas, 12/16 secondary.
- Métrica: `JetBrains Mono 600` — KPI 32px, tabla numérica tabular-nums, `codigoMedidor`, `consumoExternoId` 12px mono.
- Mayúsculas 11px tracking 0.08em para labels `ORGANIZACIÓN / RECURSO / ESTADO`.

### Espaciado y forma

- Escala 4px: `4, 8, 12, 16, 24, 32`. Card padding 16-20, gap grid 16, sidebar 264px, topbar 64px.
- Radius: card 12, input 8, chip/badge 999, botón 10.
- Sombras dark mínimas: `0 1px 0 rgba(255,255,255,0.04)` inset + `0 8px 24px rgba(0,0,0,0.35)`.
- Grid: 12 col desktop ≥1280, 8 col tablet, 1 col móvil <768. Tablas → cards apiladas en móvil.

## 3. Layout global

- **Sidebar izquierda (desktop):** logo AquaWatt, selector `Organización` (aislamiento multi-tenant), nav: Dashboard, Consumo, Puntos medición, Umbrales, Alertas, Metas, Tarifas, Recomendaciones, Reportes, Organizaciones, Auditoría. Footer: usuario + rol + estado integración POS (dot verde/rojo).
- **Topbar:** breadcrumb, search global por `codigoMedidor`, rango fecha, botón `+ Registrar consumo`, campana alertas con contador crítico.
- **Móvil:** bottom nav 5 ítems (Dashboard, Consumo, Alertas, Medidores, Más) + topbar compacta. Sidebar → drawer.
- Accesibilidad: contraste AA, foco teal 2px, iconos + texto (no solo color), tablas con `scope`, gráficos con tabla alternativa.

## 4. Componentes clave

1. **KPI card:** label 11px uppercase, valor mono 28-32, delta % chip, sparkline. Variantes `agua`/`energia`.
2. **Chart consumo:** área/linea dual (agua sky, energía amber), overlay meta verde dashed + umbral rojo dashed, tooltip con `cantidad + unidadMedida + fechaConsumo`.
3. **Tabla densa:** header sticky, mono numérico derecha, badge recurso, badge estado, row click → drawer detalle. Empty state: “Sin registros para este filtro”.
4. **Badge recurso:** `AGUA` sky dot, `ENERGÍA` amber dot. Badge nivel: `NORMAL` gris, `ADVERTENCIA` amber, `CRÍTICO` rojo pulsante.
5. **Alerta card:** nivel color izquierda, mensaje, `puntoMedicion + recurso + fechaGeneracion`, acciones `Acusar / Resolver / Reenviar POS`.
6. **Umbral editor:** rangos min-max no solapados, slider dual + inputs NUMERIC, validación inline.
7. **Medidor card:** `codigoMedidor` mono único, estado dot, último consumo, consumo hoy.
8. **Meta progreso:** barra progreso % 0-100, fechas inicio-fin, validación.
9. **Tarifa tabla:** períodos `fechaInicio-fin`, `precioPorUnidad NUMERIC`, recurso.
10. **Recomendación:** icono, ahorro estimado kWh/litros + Bs, botón `Aplicar`.
11. **Drawer recepción POS:** muestra `consumoExternoId`, `idempotencyKey`, `organizacionExternaId`, `origen: POS`, estado cola.
12. **Toasts:** éxito/error idempotencia “Ya procesado, no duplicado”.

## 5. Pantallas (10 módulos, responsive ambos)

1. **Dashboard:** 4 KPIs (Agua hoy L, Energía hoy kWh, Alertas críticas abiertas, Ahorro vs meta), gráfico 24h/7d dual, lista alertas recientes, top medidores.
2. **Organizaciones:** tabla org + usuarios asociados, drawer `UsuarioOrganizacion`, aislamiento visual por selector.
3. **Puntos de medición:** grid cards medidor + filtro por `TipoRecurso`, `codigoMedidor` único destacado, estado.
4. **Consumo / RegistroConsumo:** filtros fecha/recurso/medidor, tabla `cantidad NUMERIC + unidadMedida (litros/kWh)`, origen badge `POS/manual`, detalle idempotencia.
5. **Umbrales / UmbralClasificacion:** por recurso, rangos con color, validación no-solape.
6. **Alertas + Notificaciones:** inbox por nivel, acuse, `EntregaAlerta` a POS log, push/email toggles.
7. **Metas / MetaReduccion:** cards progreso, crear meta % + rango fechas.
8. **Tarifas:** tabla períodos + calculadora costo `cantidad * tarifa`.
9. **Recomendaciones:** lista priorizada por impacto, estado aplicada/pendiente.
10. **Reportes + Auditoría:** exportar CSV/PDF, gráficos agregados, tabla `AuditoriaCambio` inmutable.

Flujos críticos a diseñar: `POS → Cola → RecepcionConsumoPOS → Registro → Clasificación → Alerta → Entrega POS`, y manejo `idempotencyKey` duplicado sin error.

## 6. Datos de ejemplo (usar en mockups)

- Org: `Heladería Central — La Paz`
- Medidores: `AGU-LP-001 (agua, litros)`, `ENE-LP-014 (energia, kWh)`
- Consumo: `125.5 litros, 2026-09-21T18:00, origen POS, consumoExternoId uuid`
- Alerta: `CRÍTICO — ENE-LP-014 superó umbral 25 kWh — 32.4 kWh`
- Meta: `-12% energía Sep-Oct`
- Tarifa: `agua 3.20 Bs/m³, energía 0.85 Bs/kWh`

## 7. No hacer

- No modo claro en v1, no compartir tablas con POS, no `apiKey` en texto plano (solo `apiKeyHash`), no float para dinero/medición (usar NUMERIC visualmente con 2-4 decimales), no verde para alertas, no tablas sin estado vacío/error, no ocultar acciones tras solo-icono en móvil.
