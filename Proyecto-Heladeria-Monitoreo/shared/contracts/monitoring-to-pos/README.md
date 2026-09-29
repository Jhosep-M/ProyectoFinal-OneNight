# Contrato Monitoreo → POS — alerts.v1

> v1 congelado. Cambio solo con PR + aviso a las 4 personas + bump a *.v2.json, nunca editar v1 in-place.

Endpoint: `POST /api/v1/integrations/alerts`
Schema: `alert.schema.json` (`$id: https://heladeria.local/contracts/alerts.v1.json`, draft-07).

## Campos

| Campo | Tipo | Requerido | Reglas |
|---|---|---|---|
| alertaId | string (uuid) | sí | Identificador único de la alerta. Base de idempotencia en POS (no duplicar reenvíos del mismo `alertaId`). |
| nivel | enum | sí | `info` \| `advertencia` \| `critico` |
| tipoRecurso | enum | sí | `agua` \| `energia` |
| mensaje | string | sí | 1–500 caracteres |
| fechaGeneracion | string (date-time) | sí | ISO 8601 |

`additionalProperties: false` — ningún campo extra permitido.

## Ejemplo

```json
{
  "alertaId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "nivel": "critico",
  "tipoRecurso": "energia",
  "mensaje": "Consumo superior al umbral",
  "fechaGeneracion": "2026-09-21T18:00:00.000Z"
}
```
