-- Migracion 013 — permiso para LEER alertas recibidas de Monitoreo en el POS.
-- Idempotente. Se agrega GET /api/v1/integrations/alerts (routes/integrations.js)
-- que lista alerta_pos con turno_id NULL (alertas externas de Monitoreo).
INSERT INTO permiso (nombre, descripcion, modulo) VALUES
  ('alerta.consultar', 'Ver alertas recibidas de Monitoreo', 'integracion')
ON CONFLICT (nombre) DO NOTHING;

-- Conceder a los roles que operan el POS (cajero ve el dashboard) y supervisan.
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id_rol, p.id_permiso
  FROM rol r
  CROSS JOIN permiso p
 WHERE p.nombre = 'alerta.consultar'
   AND r.nombre IN ('cajero', 'supervisor', 'admin')
   AND NOT EXISTS (
     SELECT 1 FROM rol_permiso x
      WHERE x.rol_id = r.id_rol AND x.permiso_id = p.id_permiso
   );
