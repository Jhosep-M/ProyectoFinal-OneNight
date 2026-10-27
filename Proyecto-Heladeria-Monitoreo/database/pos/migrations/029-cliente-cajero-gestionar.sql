-- Migration 029 - Cliente: cajero puede corregir (editar/eliminar) para nombre mal cargado.
-- Idempotente. DELETE sigue bloqueado por backend si tiene ventas/movimientos (409).
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id_rol, p.id_permiso FROM rol r, permiso p
WHERE r.nombre = 'cajero'
  AND p.nombre IN ('cliente.gestionar')
  AND NOT EXISTS (SELECT 1 FROM rol_permiso x WHERE x.rol_id = r.id_rol AND x.permiso_id = p.permiso_id);
