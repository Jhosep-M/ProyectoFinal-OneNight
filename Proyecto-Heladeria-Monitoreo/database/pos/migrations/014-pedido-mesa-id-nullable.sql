-- Migracion 014 — Mostrador / Para llevar: un pedido puede no tener mesa.
-- El backend (routes/orders.js) y el frontend (PedidosPage) envian mesa_id=null
-- cuando el pedido es de mostrador; el CHECK/FK de mesa se mantiene, solo se
-- permite NULL. Idempotente: si ya es nullable no hace nada.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'pedido'
       AND column_name = 'mesa_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.pedido ALTER COLUMN mesa_id DROP NOT NULL;
  END IF;
END $$;
