-- Seed demo para ver el frontend con datos. Idempotente (ON CONFLICT DO NOTHING).
-- Aplicar: psql "$DATABASE_URL" -f 003_seed_demo.sql
SET search_path TO monitoreo, public;

-- Medidores demo
INSERT INTO punto_medicion (organizacion_id, tipo_recurso_id, codigo_medidor, nombre)
SELECT '11111111-1111-4111-8111-111111111111', tr.id, v.codigo, v.nombre
FROM tipo_recurso tr
CROSS JOIN (VALUES
  ('agua',    'AGU-LP-001', 'Caudalímetro principal'),
  ('agua',    'AGU-LP-003', 'Lavado de tinas'),
  ('energia', 'ENE-LP-014', 'Analizador compresores')
) AS v(cod, codigo, nombre)
WHERE tr.codigo = v.cod
ON CONFLICT (codigo_medidor) DO NOTHING;

-- Umbrales energía (agua ya viene en 002)
INSERT INTO umbral_clasificacion (organizacion_id, tipo_recurso_id, nombre, nivel, limite_inferior, limite_superior)
SELECT '11111111-1111-4111-8111-111111111111', tr.id, v.nombre, v.nivel, v.inf, v.sup
FROM tipo_recurso tr
CROSS JOIN (VALUES
  ('energia normal',  'normal',  0,  15),
  ('energia alerta',  'alerta',  15, 25),
  ('energia critico', 'critico', 25, 999999999)
) AS v(nombre, nivel, inf, sup)
WHERE tr.codigo = 'energia'
ON CONFLICT (organizacion_id, tipo_recurso_id, nombre) DO NOTHING;

-- Recepciones POS demo (últimos días, agua + energía)
INSERT INTO recepcion_consumo_pos
  (consumo_externo_id, idempotency_key, organizacion_id, punto_medicion_id, tipo_recurso, cantidad, unidad_medida, fecha_consumo, origen, estado)
SELECT
  v.ext::uuid, v.ikey,
  '11111111-1111-4111-8111-111111111111',
  (SELECT id FROM punto_medicion WHERE codigo_medidor = v.med),
  v.rec, v.cant, v.uni, (now() - (v.horas || ' hours')::interval), 'POS', 'procesado'
FROM (VALUES
  ('22222222-2222-4222-8222-222222222221', 'demo-key-001', 'AGU-LP-001', 'agua',    18.40,  'litros', 5),
  ('22222222-2222-4222-8222-222222222222', 'demo-key-002', 'ENE-LP-014', 'energia', 4.25,   'kWh',    5),
  ('22222222-2222-4222-8222-222222222223', 'demo-key-003', 'AGU-LP-001', 'agua',    42.10,  'litros', 26),
  ('22222222-2222-4222-8222-222222222224', 'demo-key-004', 'ENE-LP-014', 'energia', 32.40,  'kWh',    26),
  ('22222222-2222-4222-8222-222222222225', 'demo-key-005', 'AGU-LP-003', 'agua',    125.50, 'litros', 50),
  ('22222222-2222-4222-8222-222222222226', 'demo-key-006', 'ENE-LP-014', 'energia', 8.90,   'kWh',    50)
) AS v(ext, ikey, med, rec, cant, uni, horas)
ON CONFLICT (consumo_externo_id) DO NOTHING;

-- Cola marcada procesada
INSERT INTO cola_procesamiento (recepcion_id, estado, intentos)
SELECT r.id, 'procesado', 1 FROM recepcion_consumo_pos r
WHERE r.idempotency_key LIKE 'demo-key-%'
ON CONFLICT (recepcion_id) DO NOTHING;

-- Registros clasificados
INSERT INTO registro_consumo
  (id, recepcion_id, organizacion_id, punto_medicion_id, tipo_recurso_id, tipo_recurso, cantidad, unidad_medida, fecha_consumo, clasificacion, origen)
SELECT
  v.rid::uuid, r.id,
  '11111111-1111-4111-8111-111111111111',
  r.punto_medicion_id, tr.id, r.tipo_recurso, r.cantidad, r.unidad_medida, r.fecha_consumo, v.clas, 'POS'
FROM recepcion_consumo_pos r
JOIN tipo_recurso tr ON tr.codigo = r.tipo_recurso
JOIN (VALUES
  ('demo-key-001', '33333333-3333-4333-8333-333333333331', 'normal'),
  ('demo-key-002', '33333333-3333-4333-8333-333333333332', 'normal'),
  ('demo-key-003', '33333333-3333-4333-8333-333333333333', 'normal'),
  ('demo-key-004', '33333333-3333-4333-8333-333333333334', 'critico'),
  ('demo-key-005', '33333333-3333-4333-8333-333333333335', 'alerta'),
  ('demo-key-006', '33333333-3333-4333-8333-333333333336', 'normal')
) AS v(ikey, rid, clas) ON v.ikey = r.idempotency_key
ON CONFLICT (recepcion_id) DO NOTHING;

-- Alertas demo
INSERT INTO alerta (id, organizacion_id, registro_consumo_id, nivel, tipo_recurso, mensaje, estado)
VALUES
  ('44444444-4444-4444-8444-444444444441', '11111111-1111-4111-8111-111111111111',
   '33333333-3333-4333-8333-333333333334', 'critico', 'energia',
   'ENE-LP-014 superó umbral 25 kWh — 32.40 kWh', 'pendiente'),
  ('44444444-4444-4444-8444-444444444442', '11111111-1111-4111-8111-111111111111',
   '33333333-3333-4333-8333-333333333335', 'alerta', 'agua',
   'AGU-LP-003 sobre cuota diaria — 125.50 litros', 'pendiente')
ON CONFLICT (id) DO NOTHING;

-- Notificaciones broadcast (solo si no existen)
INSERT INTO notificacion (alerta_id, usuario_id, canal, estado)
SELECT v.alerta::uuid, NULL, 'in_app', 'pendiente'
FROM (VALUES
  ('44444444-4444-4444-8444-444444444441'),
  ('44444444-4444-4444-8444-444444444442')
) AS v(alerta)
WHERE NOT EXISTS (
  SELECT 1 FROM notificacion n
  WHERE n.alerta_id = v.alerta::uuid AND n.canal = 'in_app' AND n.usuario_id IS NULL
);

-- Entregas pendientes al POS
INSERT INTO entrega_alerta (alerta_id, estado, intentos)
VALUES
  ('44444444-4444-4444-8444-444444444441', 'pendiente', 0),
  ('44444444-4444-4444-8444-444444444442', 'pendiente', 0)
ON CONFLICT (alerta_id) DO NOTHING;

-- Meta demo (solo si no existe una con el mismo nombre)
INSERT INTO meta_reduccion (organizacion_id, tipo_recurso_id, nombre, porcentaje_reduccion, fecha_inicio, fecha_fin)
SELECT '11111111-1111-4111-8111-111111111111', tr.id, 'Reducir energía 12% Sep-Oct', 12, CURRENT_DATE - 15, CURRENT_DATE + 15
FROM tipo_recurso tr WHERE tr.codigo = 'energia'
AND NOT EXISTS (
  SELECT 1 FROM meta_reduccion m
  WHERE m.organizacion_id = '11111111-1111-4111-8111-111111111111' AND m.nombre = 'Reducir energía 12% Sep-Oct'
);

-- Tarifas demo (solo si no existen)
INSERT INTO tarifa (organizacion_id, tipo_recurso_id, nombre, monto, unidad, fecha_inicio, fecha_fin)
SELECT '11111111-1111-4111-8111-111111111111', tr.id, v.nombre, v.monto, v.unidad, CURRENT_DATE - 60, CURRENT_DATE + 300
FROM tipo_recurso tr
CROSS JOIN (VALUES
  ('agua',    'Agua EPSAS m3',      3.20, 'Bs/m3'),
  ('energia', 'Energía DELAPAZ kWh', 0.85, 'Bs/kWh')
) AS v(cod, nombre, monto, unidad)
WHERE tr.codigo = v.cod
AND NOT EXISTS (
  SELECT 1 FROM tarifa t
  WHERE t.organizacion_id = '11111111-1111-4111-8111-111111111111' AND t.nombre = v.nombre
);

-- Recomendaciones demo (solo si no existen)
INSERT INTO recomendacion (organizacion_id, titulo, descripcion, prioridad, estado)
SELECT '11111111-1111-4111-8111-111111111111', v.titulo, v.descripcion, v.pri, 'abierta'
FROM (VALUES
  ('Apagar compresor en horas valle', 'Programar apagado 22:00-06:00 ahorra ~4 kWh/día', 'alta'),
  ('Revisar fuga en lavado de tinas', 'Flujo continuo detectado fuera de horario', 'alta'),
  ('Limpieza de condensadores', 'Mejora eficiencia ~5% mensual', 'media')
) AS v(titulo, descripcion, pri)
WHERE NOT EXISTS (
  SELECT 1 FROM recomendacion r
  WHERE r.organizacion_id = '11111111-1111-4111-8111-111111111111' AND r.titulo = v.titulo
);
