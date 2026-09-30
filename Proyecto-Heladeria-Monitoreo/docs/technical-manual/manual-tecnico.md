# Manual Técnico — POS

## Arquitectura

### Capas del backend

```
routes → services → (funciones PG) → base de datos
```

Las rutas tienen handlers inline con validación Zod. Los services delegan a funciones PG `SECURITY DEFINER` para operaciones críticas.

### Funciones PG (fuente de verdad)

| Función | Uso |
|---------|-----|
| `public.registrar_venta` | Crea venta, valida stock/precios con `FOR UPDATE`, descuenta producto e insumos, acumula puntos |
| `public.anular_venta` | Anula venta, restaura stock e insumos, registra auditoría |
| `public.procesar_devolucion` | Devolución parcial/total, restaura stock e insumos, registra auditoría |
| `public.cerrar_turno` | Cierra turno, calcula ventas/esperado/diferencia, genera consumo reportado |
| `usuario_tiene_permiso` | Verifica permisos RBAC (2 args para backend, 1 arg para RLS) |

### Seguridad

- **Autenticación**: JWT de Supabase Auth, validado en middleware `authenticateJWT`
- **Autorización**: middleware `authorize(permiso)` consulta `usuario_tiene_permiso`
- **Validación**: Zod en todas las rutas
- **Auditoría**: función `auditLog` en operaciones críticas
- **Rate limiting**: `express-rate-limit` (100 req/15min API, 20 req/15min auth)
- **Helmet**: headers de seguridad
- **CORS**: restringido por entorno

## Migraciones

Ubicación: `database/pos/migrations/`

| Archivo | Contenido |
|---------|-----------|
| `001-v2.1-ddl.sql` | DDL, CHECKs, UNIQUEs, FK auth.users, RLS |
| `002-b2-uniques.sql` | UNIQUEs promocion_producto, receta_insumo |
| `002-p4-security.sql` | Permisos, roles, usuario_tiene_permiso |
| `003-p4-authorize-seeds.sql` | Seeds RBAC + función 2 args |
| `004-p4-reconcile-002.sql` | turno_id nullable en alerta_pos |

## Tests

### Backend

```bash
cd pos/posBackend
npx jest
```

- 25 suites, 137 tests
- Tests de servicios (con mock de Sequelize)
- Tests de seguridad (auth, RBAC, rate limit)
- Tests de integración (cola, alertas)
- Tests de migraciones (convenio)

### Frontend

```bash
cd pos/frontend
npx vitest run
```

- 24 archivos, 104 tests
- Tests de componentes (Button, Input, Card, DataTable, Modal, etc.)
- Tests de páginas (Ventas, Caja, Pedidos, Mesas, Dashboard, etc.)
- Tests de auth/rutas (Login, Layouts, Sidebar)

## Integración con Monitoreo

### POS → Monitoreo

- Tabla `cola_integracion` con worker (intervalo 30s)
- Batch de 5, `FOR UPDATE SKIP LOCKED`
- Backoff: 5min × intentos, máximo 10
- Contrato: `consumption.v1`

### Monitoreo → POS

- Endpoint `POST /api/v1/integrations/alerts` con API-key
- Idempotencia por `alerta_externa_id` UNIQUE
- Contrato: `alerts.v1`

## Estructura de carpetas

```
pos/frontend/src/
├── components/     # Componentes reutilizables
├── layouts/        # AuthLayout, MainLayout, Sidebar
├── pages/          # Páginas por módulo
├── routes/         # AppRoutes, catalogoRoutes
├── services/       # Services frontend (apiFetch)
├── context/        # AuthContext
└── styles/         # tokens.css, components.css, app.css

pos/posBackend/src/
├── controllers/    # Capa de abstracción (futura)
├── integrations/   # Cliente HTTP Monitoreo
├── jobs/            # Worker de cola
├── middlewares/    # authenticate, authorize, rateLimit, etc.
├── models/         # Modelos Sequelize (31)
├── repositories/   # findForUpdate helpers
├── routes/         # 17 routers
├── services/       # Lógica de negocio (delega a PG)
├── utils/          # auditLog, dbErrors
└── validators/     # Schemas Zod
```

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `PORT` | Puerto del backend (3000) |
| `DATABASE_URL` | Conexión PostgreSQL |
| `SUPABASE_URL` | URL de Supabase |
| `SUPABASE_ANON_KEY` | Key anónima |
| `SUPABASE_SERVICE_ROLE_KEY` | Key service role (backend) |
| `CORS_ORIGIN` | Origen CORS permitido |
| `RATE_LIMIT_*` | Configuración rate limit |
| `MONITOREO_URL` | URL del backend Monitoreo |
| `MONITOREO_API_KEY` | API key de Monitoreo |
| `POS_ALERT_API_KEY` | API key para recibir alertas |
| `ORGANIZACION_EXTERNA_ID` | ID de organización en Monitoreo |
