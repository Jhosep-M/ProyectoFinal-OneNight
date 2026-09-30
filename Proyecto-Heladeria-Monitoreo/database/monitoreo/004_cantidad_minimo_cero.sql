-- 004 — cantidad mínima 0 (alinear DDL con contrato consumption.v1).
-- El contrato shared/contracts/pos-to-monitoring/consumption.schema.json define
-- cantidad con minimum 0: un turno sin equipos activos reporta 0 legítimo.
-- Las CHECK originales (> 0) rechazaban telemetría válida y rompían la
-- integración POS -> Monitoreo (cola en 'error' + reintentos inútiles).
-- Idempotente y sin pérdida de datos: solo amplía el rango permitido.
ALTER TABLE monitoreo.recepcion_consumo_pos
  DROP CONSTRAINT IF EXISTS recepcion_consumo_pos_cantidad_check;
ALTER TABLE monitoreo.recepcion_consumo_pos
  ADD CONSTRAINT recepcion_consumo_pos_cantidad_check CHECK (cantidad >= 0);
ALTER TABLE monitoreo.registro_consumo
  DROP CONSTRAINT IF EXISTS registro_consumo_cantidad_check;
ALTER TABLE monitoreo.registro_consumo
  ADD CONSTRAINT registro_consumo_cantidad_check CHECK (cantidad >= 0);
