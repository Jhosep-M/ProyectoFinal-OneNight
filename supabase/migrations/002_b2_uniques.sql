-- Migration 002 - Bloque 2: UNIQUEs promocion_producto y receta_insumo
-- Live ya los tiene como UNIQUE INDEX (verificado 2026-09-28); forma INDEX para idempotencia.

CREATE UNIQUE INDEX IF NOT EXISTS ux_promocion_producto
  ON public.promocion_producto (promocion_id, producto_id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_receta_producto_insumo
  ON public.receta_insumo (producto_id, insumo_id);
