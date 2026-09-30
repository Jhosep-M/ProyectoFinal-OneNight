# Spec — Stitch a código: Consola Operativa clara 2-colores — 2026-09-28

> Enfoque A aprobado: reemplazo total del tema. Fuente Stitch verificada (proyecto `13436680139943512314`, design system `assets/10396771014437783207` v2).

## 1. Origen Stitch (verificado)

- Proyecto: **Monitoreo Agua y Energia - Consola Operativa** (`projects/13436680139943512314`), DESKTOP, privado.
- Design system **Consola Operativa**: LIGHT, NEUTRAL, customColor `#1E40AF`, Inter todo, ROUND_FOUR.
- Dashboard verificado: “Panel de Control - Consumos de Agua y Energía” (`screens/0006c32ca6e14825a109c2849baae699`): sidebar Heladería Central La Paz + nav con badge Alertas 3, topbar con rango de fechas + Registrar consumo, 4 KPIs (Agua hoy 125,50 L, Energía hoy 32,40 kWh, Alertas 3, Meta 91,6%), tabla consumos recientes (fecha, medidor, tipo, cantidad coma decimal, origen POS, estado), lista 3 alertas con Reconocer, estado de medidores.
- Consumo, Alertas, Medidores: solicitados en Stitch; el listado API devuelve vacío pese a existir pantallas, así que el plan usa los prompts aprobados como fuente y ordena verificar en la UI de Stitch antes de codificar cada vista.

## 2. Objetivo y alcance

Reemplazar el tema oscuro actual del frontend Monitoreo por el sistema claro 2-colores de Stitch en **todo el frontend** (13 vistas + Dashboard + Auditoría + Login + MainLayout). Un solo tema, sin toggle. Lógica, endpoints, Auth y RBAC sin cambios.

## 3. Tokens (fiel a Stitch, sin inventar)

- Fondo papel `#F8FAFC`, superficies `#FFFFFF`, texto tinta `#0F172A`, secundario gris `#475569`, bordes 1px `#E2E8F0`.
- Azul industrial `#1E40AF`: acciones primarias, nav activo, métricas y badges de AGUA, links.
- Amarillo señal `#CA8A04` (planos grandes) / `#EAB308` (badges pequeños): ENERGÍA, alertas, avisos. Texto sobre amarillo siempre oscuro.
- Tipografía Inter (sistema actual ya la usa; no agregar fuentes). Radio 4px, sin sombras, sin gradientes.
- Números: coma decimal es-BO, mono tabular-nums, alineados a la derecha en tablas.
- Foco visible azul 2px. Estados por texto + color, nunca solo color.

## 4. Layout y vistas

- **MainLayout**: sidebar claro 264px (marca, selector org, nav con badge Alertas 3, usuario + Salir) + topbar (rango fechas, Registrar consumo, estado sensores) + contenido.
- **Dashboard**: 4 KPIs + tabla recientes + alertas con Reconocer + estado medidores (según Stitch).
- **Consumo**: filtros + tabla + paginación + drawer idempotencia (ya existe, solo re-temar + panel claro).
- **Alertas**: filtro nivel + acciones Acusar/Resolver/Reenviar (ya existe, re-temar).
- **Medidores, Umbrales, Metas, Tarifas (+calculadora), Recomendaciones, Reportes (CSV+print), Organizaciones, Notificaciones, Auditoría, Login**: misma lógica actual, clases y badges al nuevo sistema.
- Login: tarjeta clara, mismo flujo, redirect a `/`.

## 5. Data flow y seguridad (sin cambios)

`AuthContext → orgSeleccionada → services → api.js Bearer → backend requirePermission + scopeOrg`. Sin service-role en React. Validaciones existentes se mantienen (umbrales no-solape, metas 0-100%, fechas).

## 6. QA por vista

`npm run build` ok, login real, loading/error/empty, sin `console.error`, responsive desktop + móvil, flujo `/ → /consumo → /alertas → /reportes`, CSV descarga, números con coma decimal.

## 7. Fases (para writing-plans)

1. styles.css nuevo + MainLayout + Login.
2. Dashboard según Stitch.
3. Consumo + Medidores.
4. Alertas + Notificaciones + Umbrales.
5. Metas + Tarifas + Recomendaciones + Organizaciones.
6. Reportes + Auditoría + QA final.

## 8. Self-review

- Sin TBD: tokens, vistas y endpoints concretos; fuente Stitch citada con IDs.
- Consistencia: un solo tema claro; neutros no cuentan como colores; amarillo con texto oscuro.
- Alcance: un plan, todo el frontend Monitoreo; backend fuera.
- Ambigüedad resuelta: `#CA8A04` en superficies grandes, `#EAB308` solo badges pequeños; sin modo oscuro v1.

---
Aprobado por usuario (alcance total + enfoque A + diseño). Siguiente: invocar `writing-plans`. No commitear (AGENTS.md §10.1).
