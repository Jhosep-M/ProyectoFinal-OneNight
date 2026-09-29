-- Fase A — cerrar_turno endurecido (borrador Nuevo.md + ownership + idempotencia cola).
-- Firma nueva con p_usuario_id; actualizar REVOKE antiguos (uuid,numeric) tras aplicar.
CREATE OR REPLACE FUNCTION public.cerrar_turno(
  p_turno_id uuid,
  p_monto_final_real numeric,
  p_usuario_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_turno turno_caja%ROWTYPE;
  v_total_ventas numeric(14,2) := 0;
  v_total_efectivo numeric(14,2) := 0;
  v_monto_esperado numeric(14,2);
  v_diferencia numeric(14,2);
  v_umbral numeric(14,2);
  v_alerta_id uuid;
  v_consumo_agua uuid;
  v_consumo_energia uuid;
BEGIN
  IF p_turno_id IS NULL THEN RAISE EXCEPTION 'El turno es obligatorio'; END IF;
  IF p_usuario_id IS NULL THEN RAISE EXCEPTION 'El usuario es obligatorio'; END IF;
  IF p_monto_final_real IS NULL OR p_monto_final_real < 0 THEN RAISE EXCEPTION 'El monto final real no es válido'; END IF;

  SELECT * INTO v_turno FROM turno_caja WHERE id_turno = p_turno_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'El turno no existe'; END IF;
  IF v_turno.estado <> 'abierto' THEN
    RAISE EXCEPTION 'El turno no está abierto. Estado actual: %', v_turno.estado;
  END IF;
  IF v_turno.usuario_id <> p_usuario_id
     AND NOT public.usuario_tiene_permiso(p_usuario_id, 'turno.cerrar.todos') THEN
    RAISE EXCEPTION 'No autorizado a cerrar turno ajeno';
  END IF;

  UPDATE equipo_turno SET hora_fin = NOW(), estado = 'finalizado'
  WHERE turno_id = p_turno_id AND estado = 'activo' AND hora_fin IS NULL;

  SELECT COALESCE(SUM(total), 0) INTO v_total_ventas FROM venta
  WHERE turno_id = p_turno_id AND estado = 'activa';

  SELECT COALESCE(SUM(p.monto), 0) INTO v_total_efectivo
  FROM pago p INNER JOIN venta v ON v.id_venta = p.venta_id
  INNER JOIN metodo_pago mp ON mp.id_metodo_pago = p.metodo_pago_id
  WHERE v.turno_id = p_turno_id AND v.estado = 'activa'
    AND p.estado = 'confirmado' AND LOWER(mp.nombre) = 'efectivo';

  v_monto_esperado := COALESCE(v_turno.monto_inicial, 0) + v_total_efectivo;
  v_diferencia := p_monto_final_real - v_monto_esperado;

  SELECT valor::numeric INTO v_umbral FROM configuracion_pos WHERE clave = 'umbral_diferencia_caja';
  v_umbral := COALESCE(v_umbral, 50.00);

  IF ABS(v_diferencia) > v_umbral THEN
    INSERT INTO alerta_pos (turno_id, tipo, nivel, mensaje)
    VALUES (p_turno_id, 'diferencia_caja',
      CASE WHEN ABS(v_diferencia) >= v_umbral * 2 THEN 'critico' ELSE 'alto' END,
      'Diferencia de caja detectada: ' || ROUND(v_diferencia, 2) || ' Bs')
    RETURNING id_alerta INTO v_alerta_id;
  END IF;

  UPDATE turno_caja SET
    monto_final_esperado = v_monto_esperado,
    monto_final_real = p_monto_final_real,
    diferencia = v_diferencia,
    fecha_cierre = NOW(),
    estado = 'cerrado'
  WHERE id_turno = p_turno_id;

  INSERT INTO consumo_reportado (turno_id, tipo_recurso, cantidad, unidad_medida, fecha_consumo, estado)
  VALUES (p_turno_id, 'agua', public.calcular_consumo_agua(p_turno_id), 'litros', NOW(), 'pendiente')
  ON CONFLICT (turno_id, tipo_recurso) DO NOTHING
  RETURNING id_consumo INTO v_consumo_agua;
  IF v_consumo_agua IS NULL THEN
    SELECT id_consumo INTO v_consumo_agua FROM consumo_reportado WHERE turno_id = p_turno_id AND tipo_recurso = 'agua';
  END IF;

  INSERT INTO consumo_reportado (turno_id, tipo_recurso, cantidad, unidad_medida, fecha_consumo, estado)
  VALUES (p_turno_id, 'energia', public.calcular_consumo_energia(p_turno_id), 'kWh', NOW(), 'pendiente')
  ON CONFLICT (turno_id, tipo_recurso) DO NOTHING
  RETURNING id_consumo INTO v_consumo_energia;
  IF v_consumo_energia IS NULL THEN
    SELECT id_consumo INTO v_consumo_energia FROM consumo_reportado WHERE turno_id = p_turno_id AND tipo_recurso = 'energia';
  END IF;

  INSERT INTO cola_integracion (consumo_id, operacion, idempotency_key, intentos, estado, proximo_intento)
  VALUES
    (v_consumo_agua, 'enviar_consumo', 'CONSUMO-' || v_consumo_agua, 0, 'pendiente', NOW()),
    (v_consumo_energia, 'enviar_consumo', 'CONSUMO-' || v_consumo_energia, 0, 'pendiente', NOW())
  ON CONFLICT (idempotency_key) DO NOTHING;

  INSERT INTO auditoria_accion (usuario_id, accion, entidad, entidad_id, resultado, fecha, detalle)
  VALUES (p_usuario_id, 'CERRAR_TURNO', 'turno_caja', p_turno_id, 'exitoso', NOW(),
    jsonb_build_object('montoInicial', v_turno.monto_inicial, 'montoEsperado', v_monto_esperado,
      'montoReal', p_monto_final_real, 'diferencia', v_diferencia, 'alertaId', v_alerta_id,
      'consumoAguaId', v_consumo_agua, 'consumoEnergiaId', v_consumo_energia)::text);

  RETURN jsonb_build_object('exito', true, 'turnoId', p_turno_id, 'montoInicial', v_turno.monto_inicial,
    'totalVentas', v_total_ventas, 'totalEfectivo', v_total_efectivo, 'montoEsperado', v_monto_esperado,
    'montoReal', p_monto_final_real, 'diferencia', v_diferencia,
    'alertaGenerada', v_alerta_id IS NOT NULL, 'alertaId', v_alerta_id,
    'consumoAguaId', v_consumo_agua, 'consumoEnergiaId', v_consumo_energia);
END;
$$;
REVOKE ALL ON FUNCTION public.cerrar_turno(uuid,numeric,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cerrar_turno(uuid,numeric,uuid) TO service_role;
-- Compat: revocar firma antigua de 2 args si existiera en la DB viva.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'cerrar_turno' AND pg_get_function_identity_arguments(oid) = 'uuid, numeric') THEN
    REVOKE ALL ON FUNCTION public.cerrar_turno(uuid,numeric) FROM PUBLIC, anon, authenticated;
  END IF;
END $$;
