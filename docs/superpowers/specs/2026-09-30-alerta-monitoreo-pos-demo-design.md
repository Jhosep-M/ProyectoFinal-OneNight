# Diseño — Demo manual Monitoreo → POS (alerta de punta a punta)

Fecha: 2026-09-30
Estado: aprobado (pendiente plan de implementación)

## Problema

Hoy el flujo Monitoreo → POS de alertas **no se puede demostrar**:

- Monitoreo **no tiene ningún endpoint manual** para crear o reenviar una alerta.
  La única vía de creación es automática: consumo → `cola_procesamiento` →
  `processingWorker` → (si cae en un `umbral_clasificacion`) crea `alerta` +
  `entrega_alerta` → `alertDeliveryWorker` hace `POST` a `POS_ALERTS_URL`.
- El frontend de Monitoreo (`views/Alertas.jsx`) ya muestra botones
  **Acusar / Resolver / Reenviar**, pero sus rutas (`POST /alertas/:id/...`)
  **no existen** en el backend (solo `GET /alertas`) → 404.
- El POS **sí recibe y persiste** la alerta (`entrega_alerta` idempotente por
  `alerta_externa_id`, y `alerta_pos`), pero **no existe UI ni endpoint GET**
  que las muestre. Se guardan y nadie las ve.

Objetivo: poder **disparar manualmente** una alerta en Monitoreo y **verla
aparecer en el POS**, para demostrar cómo funcionan los dos sistemas de punta a
punta, respetando las reglas de arquitectura (separación por API, RBAC,
idempotencia, auditoría).

## Alcance

Incluye:

1. Monitoreo backend: permiso `alerta.gestionar`, crear alerta de prueba,
   reenviar alerta, entrega inmediata, auditoría, validación.
2. Monitoreo frontend: botón "Generar alerta de prueba" y "Reenviar" funcional.
3. POS backend: permiso `alerta.consultar` y `GET /api/v1/integrations/alerts`.
4. POS frontend: servicio + tarjeta "Alertas de Monitoreo" en el Dashboard.
5. Seeds de permisos en ambas bases y verificación de configuración de entorno.
6. Pruebas de integración (Monitoreo) y supertest (POS).

Fuera de alcance (se documenta como deuda):

- Arreglar los botones "Acusar" y "Resolver" del frontend de Monitoreo (también
  dan 404). Se dejan igual salvo indicación contraria.
- Marcos de "marcar como atendida" en el POS (opcional futuro).
- Cambios al flujo automático de consumo.

## Arquitectura / Principios aplicados

- POS y Monitoreo siguen desacoplados: la comunicación es por HTTP con
  `x-api-key` (Monitoreo → POS). No hay FK ni import de modelos entre sistemas.
- Idempotencia: el POS usa `ON CONFLICT (alerta_externa_id)` en `entrega_alerta`.
  Reenviar una alerta ya recibida devuelve `already_received` y **no duplica**.
  Se conserva y se demuestra.
- RBAC real: cada endpoint nuevo exige un permiso.
- Duabilidad: la entrega sigue encolada en `entrega_alerta`; la entrega
  inmediata es un atajo, no un reemplazo del worker ni de los reintentos.
- Auditoría: crear y reenviar registran en `auditoria`.

## Diseño detallado

### 1. Monitoreo — backend

**Permiso** `alerta.gestionar` (seed/migración en `database/monitoreo/`),
asignado al rol admin (y a los roles que ya pueden gestionar alertas).

**Validador** `monitoreo/backend/src/validators/alerta.validator.js`:

```js
alertaPruebaSchema = z.object({
  organizacionId: z.string().uuid(),
  nivel: z.enum(['alerta', 'critico']),
  tipoRecurso: z.enum(['agua', 'energia']),
  mensaje: z.string().trim().min(1).max(500).optional(),
});
```

Si se omite `mensaje`, el servicio genera uno por defecto
(ej. `"Alerta manual de prueba (agua, nivel critico)."`).

**Servicio** `services/alertas.service.js` — funciones nuevas:

- `crearAlertaManual({ organizacionId, nivel, tipoRecurso, mensaje }, tx)`:
  - `Alerta.create({ organizacion_id, registro_consumo_id: null, umbral_id: null,
    nivel, tipo_recurso, mensaje, fecha_generacion: now, estado: 'pendiente' })`
    (ambos FK son nullable según `alerta.model.js`).
  - `crearSiNoExiste(alerta.id, tx)` → encola en `entrega_alerta`.
  - `registrarAuditoria({ entidad: 'alerta', entidadId, accion: 'crear',
    detalle: { origen: 'manual', nivel, tipoRecurso } }, tx)`.
  - Devuelve la alerta.
- `reenviarAlerta(alertaId, organizacionId)`:
  - Verifica que la alerta pertenezca a la organización (si no, 404 uniforme).
  - `entrega.repository.reenviar(alertaId)`: `estado='pendiente', intentos=0,
    proximo_intento=now(), ultimo_error=null`.
  - `Alerta.update({ estado: 'pendiente' })`.
  - `registrarAuditoria({ accion: 'reenviar' })`.
  - Devuelve la alerta.

**Repositorios**:

- `alertas.repository.js`: `obtenerPorId(id)`.
- `entrega.repository.js`: `reenviar(alertaId)` (update reset).

**Entrega inmediata** (`jobs/alertDeliveryWorker.js`):

- Extraer `entregarAlertaPorId(alertaId)`: carga la alerta, llama a
  `enviarAlertaPOS(alerta)`, y actualiza estados igual que `entregarUnaVez`
  (éxito → `entrega_alerta.estado='enviada'`, `alerta.estado='entregada'`;
  fallo → recalcula `pendiente`/`error` con backoff, registra auditoría).
- Exportar `entregarAlertaPorId`.
- El servicio, tras crear/reenviar, la invoca (await, dentro de try/catch para
  no romper la creación si la entrega falla; la cola reintenta).

**Rutas** (`routes/alertas.routes.js`), todas tras `authenticateJWT`:

- `POST /api/v1/alertas/prueba`
  → `requirePermission('alerta.gestionar')`, `validateBody(alertaPruebaSchema)`,
  `scopeOrg` (valida `organizacionId` del body contra la membresía), controller.
- `POST /api/v1/alertas/:id/reenviar`
  → `requirePermission('alerta.gestionar')`, controller (verifica pertenencia).

**Controller** `controllers/alertas.controller.js`: `crearPrueba`, `reenviar`.

### 2. Monitoreo — frontend

- `services/alertasService.js`: añadir `crearPrueba({ organizacionId, nivel,
  tipoRecurso, mensaje })` → `api.post('/alertas/prueba', body)`.
- `views/Alertas.jsx`: formulario "Generar alerta de prueba" (select nivel,
  select tipo, input mensaje, botón) que usa `orgSeleccionada` del `AuthContext`;
  al enviar, refetchea la lista. El botón "Reenviar" existente queda funcional.

### 3. POS — backend

- **Permiso** `alerta.consultar` (migración en `database/pos/` + grant a los
  roles que ya tienen `integracion.consultar`).
- **Endpoint** `GET /api/v1/integrations/alerts` en `routes/integrations.js`,
  **declarado antes de `GET /:id`** (para no ser capturada por esa ruta), tras
  `authenticateJWT` y `authorize('alerta.consultar')`:
  - Query: `SELECT id_alerta, tipo, nivel, mensaje, estado, creado_en
    FROM alerta_pos WHERE turno_id IS NULL ORDER BY creado_en DESC
    LIMIT :limit OFFSET :offset` (defaults 50/200).
  - Respuesta `{ data, total, limit, offset }` (mismo formato que `GET /`).

### 4. POS — frontend

- `services/alertasService.js` (nuevo): `listarAlertasMonitoreo({ limit })` →
  `apiFetch('/integrations/alerts')`.
- `pages/dashboard/DashboardPage.jsx`: tarjeta "Alertas de Monitoreo" con nivel
  (Badge), tipo, mensaje y fecha; estado vacío "Sin alertas". Se carga en
  paralelo con ventas/mesas en el mismo `useEffect`.

### 5. Configuración y datos

- Verificar Monitoreo `POS_ALERTS_URL` = `<POS>/api/v1/integrations/alerts` y
  que `POS_ALERTS_API_KEY` (Monitoreo) == `POS_ALERT_API_KEY` (POS). Revisar
  `docker-compose.yml` y `.env.example` de ambos.
- Aplicar los seeds de permisos en ambas bases (Supabase MCP por proyecto).

## Flujo demostrable

```
1. En Monitoreo (pantalla Alertas) → "Generar alerta de prueba".
2. POST /api/v1/alertas/prueba (JWT + alerta.gestionar).
3. crearAlertaManual → alerta + entrega_alerta(pendiente) + auditoría.
4. entregarAlertaPorId → POST POS /api/v1/integrations/alerts (x-api-key).
5. POS: INSERT entrega_alerta (idempotente) + INSERT alerta_pos.
6. POS Dashboard: la tarjeta "Alertas de Monitoreo" la muestra.
7. Reenviar la misma alerta → POS responde already_received (no duplica).
```

## Errores y casos borde

- POS caído / timeout → `entregarAlertaPorId` falla, la entrega sigue
  `pendiente` con backoff y el worker reintenta.
- `organizacionId` fuera de la membresía → 403 (`scopeOrg`).
- Alerta ajena al reenviar → 404 uniforme.
- Payload inválido → 400 (Zod).
- Sin permiso → 403.

## Pruebas

- **Monitoreo** (`tests/integration`): crear prueba → alerta + entrega
  pendiente + auditoría; reenviar → reset de entrega; idempotencia extremo a
  extremo contra POS mock (`already_received`).
- **POS** (supertest): `GET /integrations/alerts` requiere `alerta.consultar`;
  devuelve solo `turno_id IS NULL`; respeta limit/offset.
- **Manual E2E**: pasos del flujo demostrable.

## Riesgos / deuda

- Toca módulos de distintos responsables (Monitoreo backend/front: Persona 3;
  recepción POS: Persona 4; Dashboard POS: Persona 1). Coordinar por AGENTS.md.
- "Acusar"/"Resolver" siguen rotos (fuera de alcance).
- La tarjeta del Dashboard POS no diferencia por organización (el POS es
  mono-tenant en su BD; las alertas externas se identifican por `turno_id NULL`).
