-- Migration 004 - P4 reconcile 002 (Persona 4)
-- 002-p4-security.sql nunca se aplico en la DB viva (roles/permisos vinieron
-- de otro seed). Esto es lo unico pendiente de 002:
-- las alertas externas (Monitoreo -> POS) no tienen turno.
-- NOTA: el indice ux_entrega_alerta_id de 002 es redundante en vivo porque
-- alerta_externa_id ya tiene constraint UNIQUE; no se recrea.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'alerta_pos'
      AND column_name = 'turno_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.alerta_pos ALTER COLUMN turno_id DROP NOT NULL;
  END IF;
END
$$;
