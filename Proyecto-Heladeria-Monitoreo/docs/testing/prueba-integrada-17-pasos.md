# Prueba integrada final — POS ↔ Monitoreo (17 pasos, AGENTS.md §13)

Runbook manual end-to-end. Precondiciones:

- Backend POS corriendo (`pos/posBackend`, `DATABASE_URL` a Supabase Heladería).
- `MONITOREO_URL`, `MONITOREO_API_KEY`, `ORGANIZACION_EXTERNA_ID` (uuid) y
  `POS_ALERT_API_KEY` configurados (ver `infrastructure/kubernetes/secrets.example.yaml`).
- Usuario cajero + supervisor en `public.usuario` (ver `POST /api/v1/users`
  o insert directo con `id_usuario = auth.users.id`).
- Pasos 6-13 marcados `[REQUIERE-P3]` hasta que Monitoreo exponga
  `POST /api/v1/integrations/consumption`; se pueden simular con un stub
  que devuelva `200 {received:true}` y reenvíe alertas a mano.

| # | Acción | Verificación | Esperado |
|---|--------|--------------|----------|
| 1 | `POST /api/v1/shifts {monto_inicial:100}` (cajero) | `SELECT * FROM turno_caja` | 1 turno `abierto` |
| 2 | `POST /api/v1/sales {turno_id, items, pagos}` | `SELECT estado,total FROM venta` | venta `activa`, pagos suman total |
| 3 | `POST /api/v1/shifts/:id/cerrar {monto_final_real}` | respuesta JSON | `diferencia`, `consumoAguaId`, `consumoEnergiaId` |
| 4 | — | `SELECT * FROM consumo_reportado WHERE turno_id=...` | 2 filas (`agua/litros`, `energia/kWh`) `pendiente` |
| 5 | — | `SELECT estado FROM cola_integracion` | 2 filas `pendiente` con `idempotency_key` único |
| 6 | Worker `processColaOnce()` `[REQUIERE-P3]` | respuesta Monitoreo 200 | `cola=enviado`, `consumo=enviado` |
| 7 | Re-ejecutar worker `[REQUIERE-P3]` | `SELECT COUNT(*) FROM recepcion...` en Monitoreo | sin duplicados (idempotencia) |
| 8 | — `[REQUIERE-P3]` | Monitoreo: `RegistroConsumo` creado | 2 registros |
| 9 | — `[REQUIERE-P3]` | Monitoreo: clasificación por umbral | nivel asignado |
| 10 | Forzar exceso `[REQUIERE-P3]` | Monitoreo: `Alerta` generada | alerta `critico`/`alto` |
| 11 | — `[REQUIERE-P3]` | Monitoreo: `EntregaAlerta` encolada | fila pendiente |
| 12 | Worker Monitoreo `[REQUIERE-P3]` | `POST /api/v1/integrations/alerts` al POS | 201 `{received:true}` |
| 13 | Reenviar misma alerta | repetir POST con igual `alertaId` | 200 `{already_received:true}` |
| 14 | — | `SELECT * FROM entrega_alerta WHERE alerta_externa_id=...` | 1 fila `recibida`, sin duplicados |
| 15 | — | `SELECT * FROM alerta_pos` | fila `pendiente` con nivel mapeado (`critico→critico`, `advertencia→medio`, `info→bajo`) |
| 16 | `POST /api/v1/sales/:id/anular` (supervisor) | `SELECT stock FROM producto` | stock restaurado + `movimiento_inventario` tipo `anulacion` |
| 17 | — | `SELECT accion,resultado FROM auditoria_accion ORDER BY fecha DESC LIMIT 20` | `REGISTRAR_VENTA`, `CERRAR_TURNO`, `ANULAR_VENTA`, `devolucion.procesar`/`pedido.cobrar` según lo ejercitado, todo `exitoso` |

Criterio de aceptación: pasos 1-5 y 12-17 en verde contra Supabase real;
6-11 en verde contra Monitoreo real o stub documentado.
