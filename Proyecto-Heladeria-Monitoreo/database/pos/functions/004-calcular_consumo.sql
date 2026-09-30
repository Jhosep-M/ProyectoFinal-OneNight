-- Fase A — cálculo de consumo por equipo_turno × equipo_consumo (RF87).
CREATE OR REPLACE FUNCTION public.calcular_consumo_energia(p_turno_id uuid) RETURNS numeric(14,4)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_total numeric(14,4);
BEGIN
  SELECT COALESCE(SUM(e.consumo_por_hora * (EXTRACT(EPOCH FROM (COALESCE(et.hora_fin, NOW()) - et.hora_inicio))/3600)),0)
  INTO v_total FROM equipo_turno et JOIN equipo_consumo e ON e.id_equipo = et.equipo_id
  WHERE et.turno_id = p_turno_id AND e.tipo_recurso = 'energia';
  RETURN round(v_total,4);
END; $$;
CREATE OR REPLACE FUNCTION public.calcular_consumo_agua(p_turno_id uuid) RETURNS numeric(14,4)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_total numeric(14,4);
BEGIN
  SELECT COALESCE(SUM(e.consumo_por_hora * (EXTRACT(EPOCH FROM (COALESCE(et.hora_fin, NOW()) - et.hora_inicio))/3600)),0)
  INTO v_total FROM equipo_turno et JOIN equipo_consumo e ON e.id_equipo = et.equipo_id
  WHERE et.turno_id = p_turno_id AND e.tipo_recurso = 'agua';
  RETURN round(v_total,4);
END; $$;
REVOKE ALL ON FUNCTION public.calcular_consumo_agua(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.calcular_consumo_energia(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calcular_consumo_agua(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.calcular_consumo_energia(uuid) TO service_role;
