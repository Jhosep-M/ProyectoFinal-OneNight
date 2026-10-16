# Cierre de turno — motivo obligatorio por diferencia sobre umbral

**Fecha:** 2026-10-13
**Relacionado:** AGENTS.md §5.2, §9 / `Proyecto-Heladeria-Monitoreo/database/pos/functions/005-cerrar_turno.sql` / `pos/posBackend/src/services/turnoService.js` / `pos/frontend/src/pages/caja/`

## Problema

Al cerrar turno el cajero ingresa el efectivo contado (`monto_final_real`) y el
sistema guardaba **cualquier** monto `>= 0` sin freno ni aviso visible. Un monto
que no cuadra con el esperado se guardaba igual, sin justificación ni acción, lo
que permitía cierres descuidados sin consecuencia.

## Objetivo

Cuando la diferencia (`|monto_real − esperado|`) supera el umbral, o cuando se
cierra un turno ajeno, el cierre **no procede sin motivo**. Con motivo válido el
cierre procede, queda justificado y auditado. Sin motivo, el cierre se rechaza.

## Decisiones

- **Comportamiento:** motivo obligatorio si `esTurnoAjeno OR |diferencia| > umbral`.
- **Flujo (reactivo):** el cliente intenta cerrar sin motivo; si falta, el backend
  responde **422** con la diferencia/esperado/umbral y el cliente reintenta con motivo.
  Una sola fuente de verdad: la función PG calcula el esperado y decide.
- **Persistencia (1A):** nueva columna `turno_caja.motivo_diferencia` + `auditoria_accion.detalle`.
- **Umbral:** global `configuracion_pos.umbral_diferencia_caja` (default 50). La columna
  `turno_caja.umbral_diferencia` queda fuera de alcance.
- **Longitud mínima del motivo:** 5 caracteres (igual que `anular_venta`/`procesar_devolucion`).

## Contrato

- Firma PG canónica: `public.cerrar_turno(p_turno_id uuid, p_monto_final_real numeric, p_usuario_id uuid, p_motivo varchar DEFAULT NULL) RETURNS jsonb`.
  Se eliminan las firmas antiguas `(uuid,numeric)` y `(uuid,numeric,uuid)` para evitar sobrecargas ambiguas.
- Si se requiere motivo y falta/es corto:
  `RAISE EXCEPTION 'MOTIVO_REQUERIDO|diferencia=%|esperado=%|umbral=%|ajeno=%'`.
- La ruta `POST /api/v1/shifts/:id/cerrar` mapea ese prefijo a **422**
  `{ code:'MOTIVO_REQUERIDO', diferencia, montoEsperado, umbral, esTurnoAjeno }`.

## Cambios

| Capa | Archivo |
|---|---|
| DB función | `database/pos/functions/005-cerrar_turno.sql` |
| DB migración | `database/pos/migrations/015-turno-motivo-diferencia.sql` |
| Servicio | `pos/posBackend/src/services/turnoService.js` |
| Controller | `pos/posBackend/src/controllers/shiftsController.js` |
| Validator | `pos/posBackend/src/validators/shifts.js` |
| Ruta | `pos/posBackend/src/routes/shifts.js` |
| Frontend | `pos/frontend/src/services/api.js`, `src/pages/caja/CerrarTurnoModal.jsx`, `src/pages/caja/CajaPage.jsx` |
| Tests | `pos/posBackend/tests/turno.test.js`, `tests/routes-wiring.test.js`, `pos/frontend/src/pages/caja/__tests__/CajaPage.test.jsx` |

## No objetivos

- No cambia el cálculo del esperado ni los consumos.
- No usa `turno_caja.umbral_diferencia` por turno (posible mejora futura).
- No cambia el flujo de cierre ajeno salvo persistir su motivo.

## Verificación

- Jest backend: `turno`, `routes-wiring`, `shifts-ownership`, `security.rbac-seeds` en verde.
- Vitest frontend: `CajaPage` (incluye caso 422) y `TurnosAdminPage` en verde.
- Live POS: `cerrar_turno` con diferencia > umbral y sin motivo → `MOTIVO_REQUERIDO`; con motivo → `exito:true` y motivo persistido.
