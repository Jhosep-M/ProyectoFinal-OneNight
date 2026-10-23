-- Migration 018 - Cliente: correo único parcial + teléfono 8 dígitos.
-- Tabla vaciada previamente (preservando ventas con cliente_id=NULL).
-- Idempotente.

-- Normalizar correos vacíos a NULL
UPDATE public.cliente SET correo = NULL WHERE correo IS NOT NULL AND trim(correo) = '';

-- UNIQUE parcial insensible a mayúsculas (permite múltiples NULL)
CREATE UNIQUE INDEX IF NOT EXISTS ux_cliente_correo_lower
  ON public.cliente (lower(correo))
  WHERE correo IS NOT NULL;

-- Teléfono obligatorio 8 dígitos
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_cliente_telefono_8dig') THEN
    ALTER TABLE public.cliente ADD CONSTRAINT chk_cliente_telefono_8dig CHECK (telefono ~ '^[0-9]{8}$');
  END IF;
END $$;

-- NOT NULL solo si no hay nulos (tabla vacía => seguro)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.cliente WHERE telefono IS NULL) THEN
    ALTER TABLE public.cliente ALTER COLUMN telefono SET NOT NULL;
  END IF;
END $$;
