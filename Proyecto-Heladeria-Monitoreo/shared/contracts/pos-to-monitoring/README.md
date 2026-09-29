# Contrato POS → Monitoreo — consumption.v1

> v1 congelado. Cambio solo con PR + aviso a las 4 personas + bump a *.v2.json, nunca editar v1 in-place.

Endpoint: `POST /api/v1/integrations/consumption`
Schema: `consumption.schema.json` (`$id: https://heladeria.local/contracts/consumption.v1.json`, draft-07).

## Campos

| Campo | Tipo | Requerido | Reglas |
|---|---|---|---|
| consumoExternoId | string (uuid) | sí | Identificador único del consumo en POS. Base de idempotencia en Monitoreo. |
| tipoRecurso | enum | sí | `agua` \| `energia` |
| cantidad | number | sí | `>= 0` |
| unidadMedida | enum | sí | `litros` \| `kWh` |
| fechaConsumo | string (date-time) | sí | ISO 8601 |
| organizacionExternaId | string (uuid) | sí | Organización propietaria del consumo |
| origen | const | sí | Siempre `"POS"` |
| idempotencyKey | string | no | 8–150 caracteres. Clave opcional de idempotencia. |

`additionalProperties: false` — ningún campo extra permitido.

## Ejemplo

```json
{
  "consumoExternoId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "tipoRecurso": "agua",
  "cantidad": 125.5,
  "unidadMedida": "litros",
  "fechaConsumo": "2026-09-21T18:00:00.000Z",
  "organizacionExternaId": "7fa85f64-5717-4562-b3fc-2c963f66afa1",
  "origen": "POS",
  "idempotencyKey": "pos-consumo-2026-09-21-0001"
}
```
