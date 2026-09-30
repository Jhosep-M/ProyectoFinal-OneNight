-- Migracion 006 — permiso para crear/reenviar alertas manualmente (demo Monitoreo -> POS).
-- Idempotente: re-ejecutable sin duplicar.
SET search_path TO monitoreo, public;

-- Permiso nuevo. No existe hoy (solo alerta.consultar, 002_seed_dev.sql:19).
INSERT INTO permiso (nombre) VALUES ('alerta.gestionar')
ON CONFLICT (nombre) DO NOTHING;

-- Conceder SOLO a roles que gestionan (admin_monitoreo y operador).
-- 'observador' es solo-lectura: no debe crear/reenviar alertas.
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id
  FROM rol r
  CROSS JOIN permiso p
 WHERE p.nombre = 'alerta.gestionar'
   AND r.nombre IN ('admin_monitoreo', 'operador')
   AND r.estado = 'activo'
ON CONFLICT (rol_id, permiso_id) DO NOTHING;
