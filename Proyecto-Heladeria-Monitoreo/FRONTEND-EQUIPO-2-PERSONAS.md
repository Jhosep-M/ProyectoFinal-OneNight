# FRONTEND — Trabajo en paralelo 2 personas (Monitoreo)

> Objetivo: que 2 personas avancen en frontend al mismo tiempo sin pisarse archivos, sin romper `develop` y usando el mismo `monitoreo/DESIGN.md` + Stitch.
> Fuente verificada: `monitoreo/frontend/src/views/` (11 vistas), `services/` (13), `routes/AppRoutes.jsx`, `layouts/MainLayout.jsx`, `context/AuthContext.jsx`.

## 1. Opción recomendada

**Opción A (cero conflicto): Persona 1 → `monitoreo/frontend`, Persona 2 → `pos/frontend`.**
Cada uno es dueño de su carpeta. Solo coordinan tokens visuales del `DESIGN.md`.

**Opción B (las 2 en Monitoreo, este archivo):** dividir por dominios independientes:

- **Frontend-A / Operación tiempo real:** Consumo, Medidores, Alertas, Umbrales, Notificaciones.
- **Frontend-B / Gestión y análisis:** Organizaciones, Metas, Tarifas, Recomendaciones, Reportes, Login + Auth.

Usa Opción B solo si ambos deben estar en Monitoreo. Si puedes, prefiere Opción A.

## 2. Dueños por archivo (Opción B — no cruzar)

### Frontend-A — dueño: `src/views/Consumo.jsx, Medidores.jsx, Alertas.jsx, Umbrales.jsx, Notificaciones.jsx`
Services: `consumoService.js, medidoresService.js, alertasService.js, umbralService.js, notificacionesService.js`
Rutas que toca: `/consumo, /medidores, /alertas, /umbrales, /notificaciones`
Meta: dashboard operativo dark, tablas densas, badges `AGUA/ENERGÍA`, niveles `NORMAL/ADVERTENCIA/CRÍTICO`, gráficos agua `#38BDF8` / energía `#FBBF24`, drawer idempotencia (`consumoExternoId, idempotencyKey`).

### Frontend-B — dueño: `src/views/Organizaciones.jsx, Metas.jsx, Tarifas.jsx, Recomendaciones.jsx, Reportes.jsx, Login.jsx`
Services: `organizacionesService.js, metasService.js, tarifasService.js, recomendacionesService.js, reportesService.js, authService.js`
Extra: `context/AuthContext.jsx, styles.css`
Rutas: `/organizaciones, /metas, /tarifas, /recomendaciones, /reportes, /login`
Meta: CRUD orgs + `UsuarioOrganizacion`, metas 0-100% con fechas, tarifas por período + calculadora, recomendaciones con ahorro, reportes CSV/PDF, login.

### Archivos COMPARTIDOS — congelados (nadie los toca sin avisar en el grupo)
`App.jsx, main.jsx, routes/AppRoutes.jsx, layouts/MainLayout.jsx, components/ProtectedRoute.jsx, services/api.js, services/supabaseClient.js`
Regla: si necesitas una ruta o un cambio de layout/API, abre mini-PR o avisa y lo hace una sola persona. No editar el archivo del otro.

## 3. Ramas Git (desde `develop`, nunca `main`)

```text
develop
 ├─ feature/monitoreo-front-a-operacion  (Frontend-A)
 └─ feature/monitoreo-front-b-gestion    (Frontend-B)
```

- Solo el dueño hace `add/commit/push` en su rama (la IA no ejecuta git que publique).
- PR hacia `develop`, otro revisa. `pull --rebase` antes de pushear.
- No subir `.env` (usar `.env.example`). No pegar `service_role`, JWT secrets ni API keys.

## 4. Contrato visual común (ambos usan `monitoreo/DESIGN.md`)

Tokens obligatorios Stitch dark: `bg #0B1210, surface #121A18, primary #14B8A6, agua #38BDF8, energia #FBBF24, critical #EF4444, text #E6EDEB, SPACE_GROTESK / INTER / JETBRAINS_MONO, radius 12`.
- Español UI, cantidades `NUMERIC` (litros/kWh, 2-4 decimales), `codigoMedidor` único en mono.
- Responsive ambos: desktop 12col + sidebar 264px / topbar 64px → móvil 1col + bottom nav (Dashboard, Consumo, Alertas, Medidores, Más).
- Stitch: primero `upload DESIGN.md` → design system, luego A genera `Consumo + Alertas`, B genera `Organizaciones + Login`. No regenerar el sistema del otro.

## 5. Protocolo diario anti-choque

1. `git pull --rebase origin develop` al iniciar.
2. Trabajar solo en tus archivos (sección 2).
3. Si tocas compartido: avisa antes, cambio mínimo, prueba `npm run dev` + `npm run build`.
4. PR pequeño diario a `develop`, CI verde, merge solo con review del otro.
5. Si hay conflicto en `AppRoutes.jsx`/`api.js`: lo resuelve el dueño del PR más nuevo con el otro en llamada, no a ciegas.

## 6. Definición de terminado por vista

```text
Vista + Service real + loading/error/empty + validación + responsive + sin console.error + build ok + captura desktop/móvil en el PR
```

Seguridad frontend: JWT de Supabase Auth en `Authorization`, nunca `service_role` en React, no confiar `userId` del input, escapar mensajes (XSS), rutas protegidas con `ProtectedRoute`.

## 7. Checklist arranque (hoy)

- [ ] A: `git checkout -b feature/monitoreo-front-a-operacion develop` — corre `Consumo, Medidores`
- [ ] B: `git checkout -b feature/monitoreo-front-b-gestion develop` — corre `Login, Organizaciones`
- [ ] Ambos: leer `monitoreo/DESIGN.md` + este archivo, confirmar dueño de archivos en el grupo
- [ ] Integrar a `develop` cada 1-2 días, prueba conjunta `/consumo → /alertas → /reportes`
