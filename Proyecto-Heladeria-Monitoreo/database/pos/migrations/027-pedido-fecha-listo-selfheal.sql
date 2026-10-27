-- Migration 027 - Self-heal fecha_listo (refuerza 026).
-- Contexto: Cocina congela con fecha_listo - fecha. Si 026 no corrió en un
-- entorno o hay listos históricos sin marca, el frontend cae a NOW() - fecha
-- y el contador crece sin fin ("662 min en espera" en vez de "tardó X min").
-- Esta migración es idempotente y re-ejecuta el backfill.
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

-- Backfill: congela los listos huérfanos al momento de aplicar.
-- Se usa NOW() (no fecha) para preservar honestamente cuánto llevan en cocina.
UPDATE public.pedido
SET fecha_listo = NOW()
WHERE estado = 'listo' AND fecha_listo IS NULL;
