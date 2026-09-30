-- Fase A — wrapper de aplicación de functions 001-005.
-- El runner de migraciones de este repo aplica archivos .sql por orden alfabético;
-- si tu runner no soporta \ir, aplica cada archivo de database/pos/functions/ en orden 001→005
-- en el editor SQL de Supabase y luego ejecuta solo el bloque seed/grant de abajo.
-- 001-registrar_venta.sql
-- 002-anular_venta.sql
-- 003-procesar_devolucion.sql
-- 004-calcular_consumo.sql
-- 005-cerrar_turno.sql
INSERT INTO configuracion_pos (clave, valor, descripcion)
VALUES ('umbral_diferencia_caja', '50.00', 'Diferencia máxima permitida antes de generar alerta')
ON CONFLICT (clave) DO NOTHING;
