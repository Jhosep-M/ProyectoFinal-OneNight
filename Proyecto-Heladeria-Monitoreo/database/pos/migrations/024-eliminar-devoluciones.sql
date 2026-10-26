-- Migration 024 - Eliminar devoluciones (desactivación sin DROP).
-- La funcionalidad de devolución parcial por producto (/api/v1/returns,
-- public.procesar_devolucion) queda desactivada a nivel de código.
-- Datos: se CONSERVAN tabla public.devolucion, columna
-- movimiento_inventario.devolucion_id y función procesar_devolucion
-- como histórico/auditoría. NO hacer DROP aquí (decisión de producto).
-- Solo se limpian permisos devolucion.* para que ningún rol los conserve.
-- Idempotente: re-ejecutable.

-- 1. Quitar asignaciones rol_permiso -> devolucion.*
DELETE FROM rol_permiso
WHERE permiso_id IN (SELECT id_permiso FROM permiso WHERE nombre IN ('devolucion.consultar','devolucion.procesar'));

-- 2. Quitar permisos del catálogo.
DELETE FROM permiso WHERE nombre IN ('devolucion.consultar','devolucion.procesar');

-- Nota: no se toca public.devolucion ni public.procesar_devolucion().
-- Quedan deprecated y sin llamadas desde el backend.
