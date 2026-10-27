-- Migration 030 - Cliente: fix 029 (typo p.permiso_id -> p.id_permiso).
-- Objetivo: cajero gestiona Clientes igual que admin (consultar/crear/puntos/gestionar).
-- 029 nunca otorgó nada porque referenciaba columna inexistente p.permiso_id.
-- Idempotente. DELETE sigue bloqueado por backend si tiene ventas/movimientos (409).
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id_rol, p.id_permiso FROM rol r, permiso p
WHERE r.nombre = 'cajero'
  AND p.nombre IN ('cliente.gestionar')
  AND NOT EXISTS (SELECT 1 FROM rol_permiso x WHERE x.rol_id = r.id_rol AND x.permiso_id = p.id_permiso);
