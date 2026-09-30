-- Fase B — alinea CHECKs de estado con el vocabulario que el backend usa.
-- Idempotente y seguro ante ambos estados de la DB viva:
-- si el CHECK ya tiene el vocabulario nuevo, no hace nada.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_pedido_estado') THEN
    ALTER TABLE pedido DROP CONSTRAINT chk_pedido_estado;
  END IF;
END $$;
ALTER TABLE pedido ADD CONSTRAINT chk_pedido_estado
  CHECK (estado IN ('abierto','en_preparacion','listo','cerrado','cancelado'));

-- pago: el backend documenta ('pendiente','confirmado','anulado','reembolsado').
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_pago_estado') THEN
    ALTER TABLE pago DROP CONSTRAINT chk_pago_estado;
  END IF;
END $$;
ALTER TABLE pago ADD CONSTRAINT chk_pago_estado
  CHECK (estado IN ('pendiente','confirmado','anulado','reembolsado'));
