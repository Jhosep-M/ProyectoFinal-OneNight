-- Migration 020 - Cliente: correo obligatorio (código) + UNIQUE total.
-- NOTA: NOT NULL definitivo pendiente hasta normalizar filas con correo NULL
-- (ej. Luis Hidalgo creado con regla anterior). El backend/frontend ya lo exigen.
-- Cuando SELECT COUNT(*) FROM cliente WHERE correo IS NULL = 0, ejecutar:
-- ALTER TABLE public.cliente ALTER COLUMN correo SET NOT NULL;
-- UNIQUE parcial ya existe (ux_cliente_correo_lower); se añade versión total:
CREATE UNIQUE INDEX IF NOT EXISTS ux_cliente_correo_lower_nn ON public.cliente (lower(correo));
