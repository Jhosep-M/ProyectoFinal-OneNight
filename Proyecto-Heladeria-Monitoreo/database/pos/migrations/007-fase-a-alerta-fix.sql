-- Fase A — fix recepción de alertas externas (Monitoreo→POS sin turno).
-- La DB viva ya relajó turno_id una vez (004-p4-reconcile-002.sql); esto lo hace
-- idempotente y agrega la columna de idempotencia que la ruta usa por SQL crudo
-- (routes/integrations.js) pero que los modelos Sequelize no tenían.
ALTER TABLE alerta_pos ALTER COLUMN turno_id DROP NOT NULL;
ALTER TABLE alerta_pos ADD COLUMN IF NOT EXISTS alerta_externa_id uuid UNIQUE;
ALTER TABLE entrega_alerta ADD COLUMN IF NOT EXISTS alerta_externa_id uuid UNIQUE;
