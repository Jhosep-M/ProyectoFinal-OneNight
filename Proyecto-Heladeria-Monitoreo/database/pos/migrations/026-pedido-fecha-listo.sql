-- Migration 026 - Congelar tiempo de espera en cocina al marcar listo.
-- Contexto: Cocina calculaba espera como NOW() - fecha siempre, incluso en
-- estado 'listo', porque PATCH /:id/estado no guardaba cuando se marco listo
-- y la tabla no tenia columna para ello. Los listos se acumulaban (solo salen
-- al cobrar -> cerrado) y el contador crecia sin fin (ej. 360 min en espera).
-- Cambio: columna fecha_listo TIMESTAMPTZ NULL. El backend la pone con NOW()
-- al transicionar a 'listo' y el frontend la usa para congelar el tiempo
-- (fecha_listo - fecha) en vez de (NOW() - fecha). Idempotente.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'pedido'
       AND column_name = 'fecha_listo'
  ) THEN
    ALTER TABLE public.pedido
      ADD COLUMN fecha_listo TIMESTAMPTZ NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_pedido_estado_listo
  ON public.pedido (estado) WHERE estado = 'listo';

-- Backfill conservador: los listos historicos sin marca se congelan al momento
-- de aplicar la migracion para que dejen de crecer sin fin. Los proximos
-- listos llevaran la hora exacta de la transicion desde el backend.
UPDATE public.pedido
SET fecha_listo = NOW()
WHERE estado = 'listo' AND fecha_listo IS NULL;
