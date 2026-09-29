-- 003 — Permiso de lectura para tipos de recurso. Idempotente.
-- El plan prevé 'recurso.consultar' para GET /recursos; el seed 002 solo creó
-- 'recurso.gestionar' (solo admin), lo que devolvía 403 a operador/observador.
SET search_path TO monitoreo, public;

INSERT INTO permiso (nombre) VALUES ('recurso.consultar')
ON CONFLICT (nombre) DO NOTHING;

-- Admin: todos los permisos (incluye el nuevo por CROSS JOIN)
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r CROSS JOIN permiso p
WHERE r.nombre = 'admin_monitoreo'
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- Operador y observador: lectura de tipos de recurso (tabla semilla agua/energia)
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r
JOIN permiso p ON p.nombre = 'recurso.consultar'
WHERE r.nombre IN ('operador', 'observador')
ON CONFLICT (rol_id, permiso_id) DO NOTHING;
