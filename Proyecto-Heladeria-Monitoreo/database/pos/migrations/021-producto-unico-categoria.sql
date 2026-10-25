-- Migration 021 - Producto: nombre unico por categoria (case-insensitive, trim).
-- BUG Trello ERRORES (vence 26-oct): dos productos de la misma categoria
-- podian tener el mismo nombre. Defensa capa 1/3 (DB). Capas 2 (backend)
-- y 3 (frontend) van en codigo.
--
-- Diagnostico previo (NO borra nada, solo lista duplicados activos actuales):
--   SELECT lower(trim(nombre)) AS nom, categoria_id, count(*),
--          string_agg(id_producto::text, ', ') AS ids
--   FROM public.producto WHERE estado = 'activo'
--   GROUP BY 1, 2 HAVING count(*) > 1;
-- Si devuelve filas: inactivar dejando el mas antiguo activo
-- (MIN(creado_en)) o pedir decision a Airton. NO hacer DELETE fisico
-- (historial de ventas). El indice parcial de abajo falla si hay duplicados.
--
-- Normaliza espacios laterales existentes (no cambia case guardado):
UPDATE public.producto
SET nombre = trim(nombre)
WHERE nombre <> trim(nombre);

-- UNIQUE parcial solo activos. COALESCE porque categoria_id es nullable
-- ("Sin categoria" en UI): sin COALESCE, NULL <> NULL y permitiria
-- duplicados sin categoria. UUID cero como bolsa "sin categoria".
CREATE UNIQUE INDEX IF NOT EXISTS ux_producto_categoria_nombre
  ON public.producto (
    COALESCE(categoria_id, '00000000-0000-0000-0000-000000000000'),
    lower(trim(nombre))
  )
  WHERE estado = 'activo';
