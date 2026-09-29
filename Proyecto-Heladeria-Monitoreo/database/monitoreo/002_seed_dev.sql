-- Seed de desarrollo para schema monitoreo. Idempotente.
SET search_path TO monitoreo, public;

-- Roles
INSERT INTO rol (nombre) VALUES ('admin_monitoreo'), ('operador'), ('observador')
ON CONFLICT (nombre) DO NOTHING;

-- Permisos
INSERT INTO permiso (nombre) VALUES
  ('organizacion.gestionar'),('organizacion.consultar'),
  ('usuario.gestionar'),
  ('medidor.gestionar'),('medidor.consultar'),
  ('recurso.gestionar'),
  ('integracion.gestionar'),('integracion.consultar'),
  ('umbral.gestionar'),('umbral.consultar'),
  ('meta.gestionar'),('meta.consultar'),
  ('tarifa.gestionar'),('tarifa.consultar'),
  ('recomendacion.gestionar'),('recomendacion.consultar'),
  ('alerta.consultar'),
  ('notificacion.consultar'),
  ('consumo.consultar'),
  ('reporte.consultar')
ON CONFLICT (nombre) DO NOTHING;

-- Rol admin: todos los permisos
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r CROSS JOIN permiso p
WHERE r.nombre = 'admin_monitoreo'
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- Rol operador: consultas + notificaciones + recomendaciones + umbrales/meta/tarifa en lectura
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r
JOIN permiso p ON p.nombre IN (
  'organizacion.consultar','medidor.consultar','integracion.consultar',
  'umbral.consultar','meta.consultar','tarifa.consultar',
  'recomendacion.consultar','recomendacion.gestionar',
  'alerta.consultar','notificacion.consultar','consumo.consultar','reporte.consultar'
)
WHERE r.nombre = 'operador'
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- Rol observador: solo lectura básica
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r
JOIN permiso p ON p.nombre IN (
  'organizacion.consultar','alerta.consultar','notificacion.consultar',
  'consumo.consultar','reporte.consultar'
)
WHERE r.nombre = 'observador'
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- Organización dev
INSERT INTO organizacion (id, nombre, nit)
VALUES ('11111111-1111-4111-8111-111111111111', 'Heladería Demo', 'DEMO-001')
ON CONFLICT (id) DO NOTHING;

-- Integración dev: api_key_hash = sha256('dev-monitoreo-integration-key')
INSERT INTO integracion (organizacion_id, nombre, api_key_hash)
SELECT id, 'POS colaWorker (dev)',
       encode(sha256('dev-monitoreo-integration-key'::bytea), 'hex')
FROM organizacion WHERE id = '11111111-1111-4111-8111-111111111111'
ON CONFLICT (api_key_hash) DO NOTHING;

-- Tipos de recurso
INSERT INTO tipo_recurso (codigo, nombre, unidad_base) VALUES
  ('agua', 'Agua', 'litros'),
  ('energia', 'Energía', 'kwh')
ON CONFLICT (codigo) DO NOTHING;

-- Punto de medición dev
INSERT INTO punto_medicion (organizacion_id, tipo_recurso_id, codigo_medidor, nombre)
SELECT '11111111-1111-4111-8111-111111111111', tr.id, 'MED-AGUA-01', 'Medidor principal agua'
FROM tipo_recurso tr WHERE tr.codigo = 'agua'
ON CONFLICT (codigo_medidor) DO NOTHING;

-- Umbrales ejemplo agua (rangos contiguos, sin solape): normal/alerta/critico
INSERT INTO umbral_clasificacion (organizacion_id, tipo_recurso_id, nombre, nivel, limite_inferior, limite_superior)
SELECT '11111111-1111-4111-8111-111111111111', tr.id, v.nombre, v.nivel, v.inf, v.sup
FROM tipo_recurso tr
CROSS JOIN (VALUES
  ('agua normal',   'normal', 0, 1000),
  ('agua alerta',   'alerta', 1000, 1500),
  ('agua critico',  'critico', 1500, 999999999)
) AS v(nombre, nivel, inf, sup)
WHERE tr.codigo = 'agua'
ON CONFLICT (organizacion_id, tipo_recurso_id, nombre) DO NOTHING;
