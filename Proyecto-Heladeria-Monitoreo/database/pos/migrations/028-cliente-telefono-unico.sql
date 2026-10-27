-- Migration 028 - Cliente: telefono unico + cierre NOT NULL (opcion Correo+Tel unicos).
-- Idempotente. Nombre puede repetirse (homonimos permitidos).
-- Si existen duplicados historicos, el CREATE UNIQUE fallara: limpiar antes con:
--   SELECT lower(trim(correo)) AS correo_norm, count(*) FROM cliente WHERE correo IS NOT NULL GROUP BY 1 HAVING count(*)>1;
--   SELECT trim(telefono) AS tel_norm, count(*) FROM cliente WHERE telefono IS NOT NULL GROUP BY 1 HAVING count(*)>1;

-- Normalizar correo y telefono
UPDATE public.cliente
SET correo = lower(trim(correo))
WHERE correo IS NOT NULL
  AND correo <> lower(trim(correo));

UPDATE public.cliente
SET telefono = trim(telefono)
WHERE telefono IS NOT NULL
  AND telefono <> trim(telefono);

UPDATE public.cliente SET correo = NULL WHERE correo IS NOT NULL AND trim(correo) = '';
UPDATE public.cliente SET telefono = NULL WHERE telefono IS NOT NULL AND trim(telefono) = '';

-- Unico telefono (parcial, permite multiples NULL historicos igual que correo)
CREATE UNIQUE INDEX IF NOT EXISTS ux_cliente_telefono
  ON public.cliente (telefono)
  WHERE telefono IS NOT NULL;

-- Cierre NOT NULL solo si ya no hay nulos (mismo patron que 018)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.cliente WHERE telefono IS NULL) THEN
    ALTER TABLE public.cliente ALTER COLUMN telefono SET NOT NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.cliente WHERE correo IS NULL) THEN
    ALTER TABLE public.cliente ALTER COLUMN correo SET NOT NULL;
  END IF;
END $$;
