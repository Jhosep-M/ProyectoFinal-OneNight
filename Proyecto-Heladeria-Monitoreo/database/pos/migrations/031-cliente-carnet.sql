-- Migration 031 - Cliente: carnet de identidad boliviano obligatorio (codigo) + UNIQUE + CHECK.
-- Formato: raiz 4-10 digitos + complemento opcional (-1A) + extension dpto opcional (LP/CB/SC/OR/PT/TJ/CH/BE/PD).
-- Ejemplos validos: 1234567 | 1234567 LP | 1234567-1A | 1234567-1A LP
-- Idempotente. NOT NULL definitivo pendiente hasta backfill de filas historicas con NULL
-- (mismo patron que 018/028 y comentario de 020):
--   Cuando SELECT COUNT(*) FROM cliente WHERE carnet_identidad IS NULL = 0, ejecutar:
--   ALTER TABLE public.cliente ALTER COLUMN carnet_identidad SET NOT NULL;

-- Normalizar vacios a NULL
UPDATE public.cliente SET carnet_identidad = NULL WHERE carnet_identidad IS NOT NULL AND trim(carnet_identidad) = '';

-- Columna (si no existe)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cliente' AND column_name = 'carnet_identidad'
  ) THEN
    ALTER TABLE public.cliente ADD COLUMN carnet_identidad TEXT;
  END IF;
END $$;

-- Normalizar existentes: trim + uppercase + colapsar espacios + guion sin espacios
UPDATE public.cliente
SET carnet_identidad = upper(regexp_replace(trim(carnet_identidad), '\s+', ' ', 'g'))
WHERE carnet_identidad IS NOT NULL;

UPDATE public.cliente
SET carnet_identidad = regexp_replace(carnet_identidad, '\s*-\s*', '-', 'g')
WHERE carnet_identidad IS NOT NULL AND carnet_identidad LIKE '%-%';

-- CHECK formato boliviano (solo filas no nulas; NULL permitido hasta backfill)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_cliente_carnet_formato') THEN
    ALTER TABLE public.cliente ADD CONSTRAINT chk_cliente_carnet_formato
      CHECK (carnet_identidad IS NULL OR carnet_identidad ~ '^[0-9]{4,10}([- ][0-9]{1,2}[A-Z])?( (LP|CB|SC|OR|PT|TJ|CH|BE|PD))?$');
  END IF;
END $$;

-- UNIQUE parcial (permite multiples NULL historicos, igual que correo/telefono)
CREATE UNIQUE INDEX IF NOT EXISTS ux_cliente_carnet
  ON public.cliente (carnet_identidad)
  WHERE carnet_identidad IS NOT NULL;

-- Indice de busqueda
CREATE INDEX IF NOT EXISTS ix_cliente_carnet
  ON public.cliente (carnet_identidad);

-- Cierre NOT NULL solo si ya no hay nulos (mismo patron que 018/028)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.cliente WHERE carnet_identidad IS NULL) THEN
    ALTER TABLE public.cliente ALTER COLUMN carnet_identidad SET NOT NULL;
  END IF;
END $$;
