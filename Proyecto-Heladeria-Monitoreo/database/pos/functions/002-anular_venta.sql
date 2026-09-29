-- Fase A — anular_venta: restaura producto + insumos receta, nunca DELETE.
CREATE OR REPLACE FUNCTION public.anular_venta(p_venta_id uuid, p_usuario_id uuid, p_motivo varchar)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF p_motivo IS NULL OR length(trim(p_motivo)) < 5 THEN RAISE EXCEPTION 'motivo requerido >=5'; END IF;
  SELECT * INTO r FROM venta WHERE id_venta = p_venta_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'venta no existe'; END IF;
  IF r.estado <> 'activa' THEN RAISE EXCEPTION 'venta no está activa: %', r.estado; END IF;
  FOR r IN SELECT * FROM detalle_venta WHERE venta_id = p_venta_id LOOP
    UPDATE producto SET stock = stock + r.cantidad WHERE id_producto = r.producto_id;
    INSERT INTO movimiento_inventario (producto_id, venta_id, usuario_id, tipo, cantidad, motivo)
    VALUES (r.producto_id, p_venta_id, p_usuario_id, 'anulacion', r.cantidad, left(p_motivo, 200));
    INSERT INTO movimiento_inventario (insumo_id, producto_id, venta_id, usuario_id, tipo, cantidad, motivo)
    SELECT rec.insumo_id, r.producto_id, p_venta_id, p_usuario_id, 'anulacion', rec.cantidad_requerida * r.cantidad, left(p_motivo, 200)
    FROM receta_insumo rec WHERE rec.producto_id = r.producto_id;
    UPDATE insumo i SET stock = stock + (rec.cantidad_requerida * r.cantidad)
    FROM receta_insumo rec WHERE rec.producto_id = r.producto_id AND i.id_insumo = rec.insumo_id;
  END LOOP;
  UPDATE venta SET estado = 'anulada', motivo_anulacion = p_motivo WHERE id_venta = p_venta_id;
  INSERT INTO auditoria_accion (usuario_id, accion, entidad, entidad_id, resultado, detalle)
  VALUES (p_usuario_id, 'ANULAR_VENTA', 'venta', p_venta_id, 'exitoso', p_motivo);
END; $$;
REVOKE ALL ON FUNCTION public.anular_venta(uuid,uuid,varchar) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.anular_venta(uuid,uuid,varchar) TO service_role;
