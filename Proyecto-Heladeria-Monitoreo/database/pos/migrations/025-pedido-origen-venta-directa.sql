-- Migration 025 - Pedido espejo de venta directa (solo cocina, no cobrable).
-- Contexto: VentasPage "Enviar a cocina" crea un pedido Sin mesa con los mismos
-- items ya cobrados solo para visibilidad en Cocina. Sin marca, Pedidos lo
-- mostraba con boton Cobrar -> riesgo de doble cobro (doble venta + stock).
-- Cambio: columna origen ('mesa' por defecto | 'mostrador' | 'venta_directa').
-- Los espejos (origen='venta_directa') se ven en Cocina pero en Pedidos
-- aparecen como "Cobrado en ventas" sin boton Cobrar, y POST /:id/cobrar
-- los rechaza con 409. Idempotente: re-ejecutable.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'pedido'
       AND column_name = 'origen'
  ) THEN
    ALTER TABLE public.pedido
      ADD COLUMN origen VARCHAR(20) NOT NULL DEFAULT 'mesa';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_pedido_origen'
  ) THEN
    ALTER TABLE public.pedido
      ADD CONSTRAINT chk_pedido_origen
      CHECK (origen IN ('mesa', 'mostrador', 'venta_directa'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_pedido_origen_estado
  ON public.pedido (origen, estado);

-- Backfill conservador: los Sin mesa historicos que ya tienen una venta con el
-- mismo contenido cercano en el tiempo se consideran mostrador normal (cobrables).
-- No se marca nada como venta_directa automaticamente para no ocultar cobros
-- legitimos pendientes. Solo los nuevos espejos llevaran origen='venta_directa'.
