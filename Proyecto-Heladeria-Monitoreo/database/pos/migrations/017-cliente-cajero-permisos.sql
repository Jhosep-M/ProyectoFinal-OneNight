-- Migration 017 - Cliente: permisos granulares para cajero (opción A).
-- Idempotente.
INSERT INTO permiso (nombre, descripcion, modulo) VALUES
  ('cliente.crear', 'Crear clientes', 'clientes'),
  ('cliente.puntos', 'Ajustar/canjear puntos', 'clientes')
ON CONFLICT (nombre) DO NOTHING;

-- cajero: consultar + crear + puntos (puede añadir y dar puntos, no editar)
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id_rol, p.id_permiso FROM rol r, permiso p
WHERE r.nombre = 'cajero'
  AND p.nombre IN ('cliente.crear', 'cliente.puntos')
  AND NOT EXISTS (SELECT 1 FROM rol_permiso x WHERE x.rol_id = r.id_rol AND x.permiso_id = p.id_permiso);

-- supervisor/admin: heredan crear+puntos además de gestionar
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id_rol, p.id_permiso FROM rol r, permiso p
WHERE r.nombre IN ('supervisor', 'admin')
  AND p.nombre IN ('cliente.crear', 'cliente.puntos')
  AND NOT EXISTS (SELECT 1 FROM rol_permiso x WHERE x.rol_id = r.id_rol AND x.permiso_id = p.id_permiso);

-- inventario: también puede crear puntos? No, solo consultar (sin cambios).
