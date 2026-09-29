# Spec — Frontend Monitoreo Completo (AquaWatt) — 2026-09-28

> Enfoque A aprobado: conexión directa, sin mocks. Fuente verificada en repo.

## 1. Estado verificado (no asumir)

Backend `monitoreo/backend/src`:
- `app.js:11-57` monta `/api/v1/auth, organizaciones, medidores, recursos, usuarios, usuarios-organizacion, umbrales, metas, tarifas, recomendaciones, integrations, consumo, alertas, notificaciones, reportes, integraciones` + `/health`.
- `middlewares/auth.middleware.js:4-27` valida JWT Supabase con `supabase.auth.getUser(token)`, respeta `req.user` inyectado solo por app/tests.
- `middlewares/rbac.middleware.js:5-42` `requirePermission(permiso)` + `scopeOrg` con aislamiento por `organizacion_id`.
- `middlewares/security.middleware.js, rateLimit.middleware.js, requestId.middleware.js, error.middleware.js` presentes.
- `models/` 21 modelos (alerta, consumo, medidor, umbral, tarifa, meta, recomendación, organización, auditoriaCambio, etc.).
- `.env.example` exige `PORT=4000, SUPABASE_URL, SUPABASE_ANON_KEY, DATABASE_URL, CORS_ORIGIN=http://localhost:5174`.

Frontend `monitoreo/frontend/src`:
- `services/api.js:1-34` envía `Authorization: Bearer <supabase session>` a `BASE=/api/v1`.
- `services/supabaseClient.js:1-7` solo anon-key, sin service-role (correcto).
- `vite.config.js:6-12` proxy `/api → http://localhost:4000`, puerto 5174.
- `routes/AppRoutes.jsx:16-38` 11 rutas protegidas, `/` redirige a `/consumo`. **Falta `/dashboard` y `/auditoria`.**
- `layouts/MainLayout.jsx:6-17` nav básico con 10 enlaces, sin sidebar 264px/topbar 64px del DESIGN.md, sin selector org multi + estado POS.
- `context/AuthContext.jsx` carga perfil + `orgSeleccionada`, correcto.
- `views/` 11 archivos + `services/` 13 archivos con llamadas reales (ej. `consumoService.js:3-10`, `Consumo.jsx:1-93` tabla + filtros + drawer básico).
- `package.json` React 19 + react-router 7 + supabase-js 2, sin lib de gráficos.

Conclusión: **backend listo para conectar**. Solo falta verificar `.env` reales y migraciones/RLS aplicadas. Frontend necesita pulido visual + Dashboard + Auditoría.

## 2. Objetivo y alcance

Planificar todo el frontend Monitoreo (completo, entrega final):
Dashboard + Consumo + Medidores + Umbrales + Alertas + Notificaciones + Organizaciones + Metas + Tarifas + Recomendaciones + Reportes + Auditoría + Login/Auth.

Idioma UI español (es-BO). Multi-org con selector. Respetar contratos `shared/contracts/` y reglas AGENTS.md §3, §4, §18 (no inventar columnas, no service-role en React, no confiar userId del input).

## 3. Arquitectura frontend (mantener, no regenerar)

```
Vite 5174 --/api--> Express 4000 --Sequelize--> Supabase/Postgres
  |                      |
AuthContext          JWT + RBAC + scopeOrg
  |                      |
AppRoutes (ProtectedRoute + MainLayout) -> views/* -> services/* -> api.js
```

- No cambiar `App.jsx, main.jsx, routes/AppRoutes.jsx, layouts/MainLayout.jsx, components/ProtectedRoute.jsx, services/api.js, services/supabaseClient.js` sin coordinación (archivos compartidos congelados según FRONTEND-EQUIPO-2-PERSONAS.md).
- División 2 personas compatible:
  - A (operación): `Consumo, Medidores, Alertas, Umbrales, Notificaciones` + Dashboard.
  - B (gestión): `Organizaciones, Metas, Tarifas, Recomendaciones, Reportes, Auditoría, Login`.
- Skills de implementación (fase plan, no invocar aún en brainstorming salvo writing-plans): `ui-ux-pro-max` + `impeccable` para pulido, `design-system` para tokens, `supabase` para Auth/RBAC/RLS.

## 4. Sistema visual (monitoreo/DESIGN.md obligatorio)

Tokens Stitch dark:
`bg #0B1210, surface #121A18, raised #1A2421, inset #080D0C, primary #14B8A6, agua #38BDF8, energia #FBBF24, critical #EF4444, text #E6EDEB/#9DB3AC, SPACE_GROTESK / INTER / JETBRAINS_MONO, radius 12/8/999`.

Componentes:
KPI card + sparkline, chart dual agua/energía + meta verde dashed + umbral rojo dashed, tabla densa mono tabular-nums, badge `AGUA/ENERGÍA` + `NORMAL/ADVERTENCIA/CRÍTICO`, alerta card con Acusar/Resolver/Reenviar POS, umbral editor sin solape, medidor card `codigoMedidor` mono único, meta barra 0-100%, tarifa tabla + calculadora `cantidad*tarifa`, recomendación con ahorro Bs, drawer recepción POS (`consumoExternoId, idempotencyKey, organizacionExternaId, origen`), toasts idempotencia.

Layout: desktop sidebar 264px + topbar 64px (breadcrumb, search `codigoMedidor`, rango fecha, `+ Registrar consumo`, campana críticos), móvil bottom nav 5 (Dashboard, Consumo, Alertas, Medidores, Más).

## 5. Pantallas (definición de terminado común)

Cada vista: service real + loading/error/empty + validación + responsive + sin `console.error` + `npm run build` ok.

1. **Dashboard (nueva):** 4 KPIs (Agua hoy L, Energía hoy kWh, Críticas abiertas, Ahorro vs meta), gráfico 24h/7d, alertas recientes, top medidores. Ruta `/` por defecto (cambiar redirect actual `/consumo`).
2. **Consumo:** filtros fecha/recurso/medidor, tabla `cantidad NUMERIC 2-4 dec + unidadMedida`, badge origen `POS/manual`, drawer idempotencia completo, paginación 25.
3. **Medidores:** grid cards + filtro TipoRecurso, CRUD `codigoMedidor` único, estado, último consumo/hoy.
4. **Umbrales:** por recurso, rangos min-max no solapados, validación inline, color por nivel.
5. **Alertas:** inbox por nivel, Acusar/Resolver/Reenviar POS, log `EntregaAlerta`.
6. **Notificaciones:** toggles push/email, lista por usuario/org.
7. **Organizaciones:** tabla org + drawer `UsuarioOrganizacion`, selector global aísla datos (`?organizacionId` validado por `scopeOrg`).
8. **Metas:** cards progreso, crear `% 0-100 + fechas inicio-fin` validadas.
9. **Tarifas:** tabla períodos `fechaInicio-fin` sin solape + `precioPorUnidad NUMERIC`, calculadora costo.
10. **Recomendaciones:** priorizadas por impacto, ahorro kWh/litros + Bs, Aplicar/pendiente.
11. **Reportes:** filtros + agregados + export CSV/PDF, gráficos.
12. **Auditoría (nueva):** tabla `AuditoriaCambio` inmutable, filtros fecha/usuario/acción.
13. **Login:** actual, redirigir a `/` (dashboard), manejo 401/403, sin exponer secretos.

## 6. Data flow y seguridad frontend

- `AuthContext.observarSesion → getSession → obtenerPerfil → orgSeleccionada → service.listar({organizacionId}) → api.js Bearer → backend requirePermission + scopeOrg`.
- Nunca `service_role` en React, nunca `userId` manual en operaciones sensibles, escapar mensajes (XSS), `ProtectedRoute` en todas salvo `/login`.
- Duplicados POS: mostrar toast “Ya procesado, no duplicado” cuando backend responda idempotente (`consumoExternoId/idempotencyKey/alertaId`).

## 7. Errores y validaciones

Rango fechas inválido, umbrales solapados, metas fuera 0-100% o fechas invertidas, tarifas con período solapado o precio negativo, `codigoMedidor` duplicado, 401 sesión expirada → login, 403 sin permiso → vacío con mensaje, timeout/retry visible en drawer integración.

## 8. Pruebas mínimas (Persona 3 + integración)

Registrar consumo, clasificar, umbral válido/inválido, alerta + notificación + entrega POS, meta, tarifa + calculadora, recomendación, reporte export, auditoría inmutable, flujo `/consumo → /alertas → /reportes`, prueba integrada POS cierre turno → consumo → alerta (AGENTS.md §13).

## 9. Fases de implementación (para writing-plans)

1. Tokens + MainLayout + Dashboard.
2. Consumo + Medidores + drawer idempotencia.
3. Umbrales + Alertas + Notificaciones.
4. Organizaciones + Metas + Tarifas + Recomendaciones.
5. Reportes + Auditoría + Login polish + QA/build.

## 10. Self-review spec

- Sin TBD/TODO: rutas, servicios y validaciones concretas arriba.
- Consistencia: no se comparten tablas con POS, solo API; `apiKeyHash` nunca en frontend; NUMERIC con formato, no float.
- Alcance: un solo plan frontend Monitoreo, backend fuera de alcance salvo verificación `.env`/migraciones.
- Ambigüedad resuelta: gráficos con lib ligera (recharts o chart.js, a decidir en plan), PDF vía print + CSV nativo en fase 1, sin modo claro v1.

---
Aprobado por usuario (Todo completo + Enfoque A + diseño). Siguiente: invocar `writing-plans` para plan detallado. No commitear (AGENTS.md §10.1: solo usuario hace git add/commit/push).
