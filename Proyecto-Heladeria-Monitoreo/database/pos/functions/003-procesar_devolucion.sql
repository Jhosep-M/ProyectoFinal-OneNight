-- Fase A — procesar_devolucion con reintegro proporcional de insumos receta.
CREATE OR REPLACE FUNCTION public.procesar_devolucion(p_venta_id uuid, p_producto_id uuid, p_cantidad integer, p_usuario_id uuid, p_motivo varchar)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_vendido numeric; v_devuelto numeric := 0; v_precio numeric; v_dev_id uuid;
  v_cli uuid; v_pts_acum integer := 0; v_total_vendido numeric := 0; v_rev integer := 0;
BEGIN
  IF p_cantidad <= 0 THEN RAISE EXCEPTION 'cantidad inválida'; END IF;
  IF p_motivo IS NULL OR length(trim(p_motivo)) < 5 THEN RAISE EXCEPTION 'motivo requerido >=5'; END IF;
  SELECT cliente_id INTO v_cli FROM venta WHERE id_venta = p_venta_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'venta no existe'; END IF;
  SELECT COALESCE(SUM(cantidad),0) INTO v_vendido FROM detalle_venta WHERE venta_id = p_venta_id AND producto_id = p_producto_id;
  IF v_vendido = 0 THEN RAISE EXCEPTION 'producto no vendido en esa venta'; END IF;
  SELECT COALESCE(SUM(cantidad),0) INTO v_devuelto FROM devolucion WHERE venta_id = p_venta_id AND producto_id = p_producto_id;
  IF v_devuelto + p_cantidad > v_vendido THEN RAISE EXCEPTION 'devuelve más de lo vendido (% vendido, % ya devuelto)', v_vendido, v_devuelto; END IF;
  SELECT precio_unitario INTO v_precio FROM detalle_venta WHERE venta_id = p_venta_id AND producto_id = p_producto_id LIMIT 1;
  INSERT INTO devolucion (venta_id, producto_id, autorizado_por_id, cantidad, monto, motivo, estado)
  VALUES (p_venta_id, p_producto_id, p_usuario_id, p_cantidad, v_precio * p_cantidad, p_motivo, 'procesada')
  RETURNING id_devolucion INTO v_dev_id;
  UPDATE producto SET stock = stock + p_cantidad WHERE id_producto = p_producto_id;
  INSERT INTO movimiento_inventario (producto_id, venta_id, devolucion_id, usuario_id, tipo, cantidad, motivo)
  VALUES (p_producto_id, p_venta_id, v_dev_id, p_usuario_id, 'devolucion', p_cantidad, left(p_motivo,200));
  INSERT INTO movimiento_inventario (insumo_id, producto_id, venta_id, devolucion_id, usuario_id, tipo, cantidad, motivo)
  SELECT rec.insumo_id, p_producto_id, p_venta_id, v_dev_id, p_usuario_id, 'devolucion', rec.cantidad_requerida * p_cantidad, left(p_motivo,200)
  FROM receta_insumo rec WHERE rec.producto_id = p_producto_id;
  UPDATE insumo i SET stock = stock + (rec.cantidad_requerida * p_cantidad)
  FROM receta_insumo rec WHERE rec.producto_id = p_producto_id AND i.id_insumo = rec.insumo_id;
  -- Reversión proporcional de puntos acumulados en la venta.
  IF v_cli IS NOT NULL THEN
    SELECT COALESCE(SUM(puntos), 0) INTO v_pts_acum FROM movimiento_puntos
    WHERE venta_id = p_venta_id AND cliente_id = v_cli AND tipo = 'acumulacion';
    SELECT COALESCE(SUM(cantidad), 0) INTO v_total_vendido FROM detalle_venta WHERE venta_id = p_venta_id;
    IF v_pts_acum > 0 AND v_total_vendido > 0 THEN
      v_rev := floor(v_pts_acum * (p_cantidad::numeric / v_total_vendido))::int;
      IF v_rev > 0 THEN
        INSERT INTO movimiento_puntos (cliente_id, venta_id, puntos, tipo, motivo)
        VALUES (v_cli, p_venta_id, -v_rev, 'reversion', 'reversion devolucion ' || v_dev_id::text);
        UPDATE cliente SET puntos_fidelidad = puntos_fidelidad - v_rev WHERE id_cliente = v_cli;
      END IF;
    END IF;
  END IF;
  INSERT INTO auditoria_accion (usuario_id, accion, entidad, entidad_id, resultado, detalle)
  VALUES (p_usuario_id, 'PROCESAR_DEVOLUCION', 'devolucion', v_dev_id, 'exitoso', to_jsonb(p_motivo));
  RETURN v_dev_id;
END; $$;
REVOKE ALL ON FUNCTION public.procesar_devolucion(uuid,uuid,integer,uuid,varchar) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.procesar_devolucion(uuid,uuid,integer,uuid,varchar) TO service_role;
