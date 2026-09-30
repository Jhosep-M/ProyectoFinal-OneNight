# Integración POS ↔ Monitoreo

## Contratos

Los contratos viven en `shared/contracts/`:

- `pos-to-monitoring/consumption.schema.json` — consumo del POS hacia Monitoreo
- `monitoring-to-pos/alert.schema.json` — alertas de Monitoreo hacia POS

## Flujo POS → Monitoreo

```
POS
 ↓
ColaIntegracion (tabla)
 ↓
Worker (colaWorker.js, intervalo 30s)
 ↓
POST /api/v1/integrations/consumption
 ↓
Monitoreo recibe, valida, registra
```

### Payload (consumption.v1)

```json
{
  "consumoExternoId": "uuid",
  "tipoRecurso": "agua",
  "cantidad": 125.5,
  "unidadMedida": "litros",
  "fechaConsumo": "2026-09-21T18:00:00",
  "organizacionExternaId": "uuid",
  "origen": "POS",
  "idempotencyKey": "uuid"
}
```

### Reintentos

- Batch de 5, `FOR UPDATE SKIP LOCKED`
- Backoff: 5min × intentos
- Máximo 10 intentos
- DLQ tras agotar intentos

## Flujo Monitoreo → POS

```
Monitoreo
 ↓
POST /api/v1/integrations/alerts (con API-key)
 ↓
POS recibe, valida, registra en EntregaAlerta + AlertaPos
```

### Payload (alerts.v1)

```json
{
  "alertaId": "uuid",
  "nivel": "critico",
  "tipoRecurso": "energia",
  "mensaje": "Consumo superior al umbral",
  "fechaGeneracion": "2026-09-21T18:00:00"
}
```

### Idempotencia

- `alerta_externa_id` UNIQUE en `entrega_alerta`
- `ON CONFLICT DO NOTHING` — no duplicar

## Mapeo de niveles

| Contrato | Base de datos |
|----------|---------------|
| info | bajo |
| advertencia | medio |
| critico | critico |

## Autenticación

- **POS → Monitoreo**: JWT de Supabase (Bearer)
- **Monitoreo → POS**: API-key (`x-api-key` header, `crypto.timingSafeEqual`)
