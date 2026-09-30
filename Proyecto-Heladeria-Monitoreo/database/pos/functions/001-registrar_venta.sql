-- Fase A — registrar_venta transaccional, idempotente, con FOR UPDATE ordenado.
-- Firmas compatibles con ventaService.crear y REVOKE en 004-p4-authorize-seeds.sql.
CREATE OR REPLACE FUNCTION public.registrar_venta(
  p_usuario_id uuid, p_turno_id uuid, p_cliente_id uuid,
  p_items jsonb, p_descuento numeric, p_pagos jsonb,
  p_idempotency_key text DEFAULT NULL,
  p_puntos_canje integer DEFAULT 0
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_venta_id uuid; v_subtotal numeric(14,2) := 0; v_total numeric(14,2);
  v_item jsonb; v_pid uuid; v_cant numeric(14,2); v_precio numeric(14,2);
  v_pago jsonb; v_suma_pagos numeric(14,2) := 0;
  v_canje integer := COALESCE(p_puntos_canje, 0);
  v_saldo integer;
  v_base numeric(14,2);
BEGIN
  IF p_turno_id IS NULL OR p_usuario_id IS NULL THEN RAISE EXCEPTION 'turno y usuario obligatorios'; END IF;
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'items vacíos'; END IF;
  IF p_pagos IS NULL OR jsonb_array_length(p_pagos) = 0 THEN RAISE EXCEPTION 'pagos vacíos'; END IF;
  IF p_descuento IS NULL OR p_descuento < 0 THEN RAISE EXCEPTION 'descuento inválido'; END IF;
  IF v_canje < 0 THEN RAISE EXCEPTION 'puntos_canje inválido'; END IF;
  IF v_canje > 0 AND p_cliente_id IS NULL THEN RAISE EXCEPTION 'canje requiere cliente'; END IF;
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id_venta INTO v_venta_id FROM venta WHERE idempotency_key = p_idempotency_key;
    IF FOUND THEN RETURN v_venta_id; END IF;
  END IF;
  PERFORM 1 FROM turno_caja WHERE id_turno = p_turno_id AND estado = 'abierto' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'turno no abierto'; END IF;
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_pid := (v_item->>'producto_id')::uuid;
    PERFORM 1 FROM producto WHERE id_producto = v_pid FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'producto % no existe', v_pid; END IF;
  END LOOP;
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_pid := (v_item->>'producto_id')::uuid;
    v_cant := (v_item->>'cantidad')::numeric;
    IF v_cant <= 0 OR v_cant <> floor(v_cant) THEN RAISE EXCEPTION 'cantidad inválida %', v_pid; END IF;
    SELECT precio INTO v_precio FROM producto WHERE id_producto = v_pid;
    IF v_precio IS NULL OR v_precio <= 0 THEN RAISE EXCEPTION 'precio inválido %', v_pid; END IF;
    v_subtotal := v_subtotal + v_cant * v_precio;
  END LOOP;
  v_total := v_subtotal - COALESCE(p_descuento, 0);
  IF v_total < 0 THEN RAISE EXCEPTION 'descuento mayor al subtotal'; END IF;
  -- Canje puntos: 1 punto = $1, descuenta del total ANTES de validar pagos.
  IF v_canje > 0 THEN
    SELECT puntos_fidelidad INTO v_saldo FROM cliente WHERE id_cliente = p_cliente_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'cliente no existe'; END IF;
    IF v_canje > v_saldo THEN RAISE EXCEPTION 'puntos insuficientes'; END IF;
    v_base := v_subtotal - COALESCE(p_descuento, 0);
    v_total := v_base - LEAST(v_canje, v_base);
    IF v_total < 0 THEN v_total := 0; END IF;
  END IF;
  FOR v_pago IN SELECT * FROM jsonb_array_elements(p_pagos) LOOP
    IF (v_pago->>'monto')::numeric <= 0 THEN RAISE EXCEPTION 'pago inválido'; END IF;
    v_suma_pagos := v_suma_pagos + (v_pago->>'monto')::numeric;
  END LOOP;
  IF round(v_suma_pagos, 2) <> round(v_total, 2) THEN RAISE EXCEPTION 'pagos % no coinciden con total %', v_suma_pagos, v_total; END IF;
  INSERT INTO venta (turno_id, cliente_id, subtotal, descuento, total, estado, idempotency_key)
  VALUES (p_turno_id, p_cliente_id, v_subtotal, COALESCE(p_descuento,0), v_total, 'activa', p_idempotency_key)
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id_venta INTO v_venta_id;
  IF v_venta_id IS NULL THEN
    SELECT id_venta INTO v_venta_id FROM venta WHERE idempotency_key = p_idempotency_key;
    RETURN v_venta_id;
  END IF;
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_pid := (v_item->>'producto_id')::uuid; v_cant := (v_item->>'cantidad')::numeric;
    SELECT precio INTO v_precio FROM producto WHERE id_producto = v_pid;
    INSERT INTO detalle_venta (venta_id, producto_id, cantidad, precio_unitario, descuento, subtotal)
    VALUES (v_venta_id, v_pid, v_cant, v_precio, 0, v_cant * v_precio);
    UPDATE producto SET stock = stock - v_cant WHERE id_producto = v_pid;
    IF (SELECT stock FROM producto WHERE id_producto = v_pid) < 0 THEN RAISE EXCEPTION 'STOCK_INSUFICIENTE %', v_pid; END IF;
    -- Modelo Fase B: tipo cerrado ('venta'), cantidad positiva, XOR producto/insumo
    -- (checks 009: tipo IN (ingreso,venta,anulacion,devolucion,ajuste), cantidad > 0).
    INSERT INTO movimiento_inventario (producto_id, venta_id, usuario_id, tipo, cantidad, motivo)
    VALUES (v_pid, v_venta_id, p_usuario_id, 'venta', v_cant, 'venta ' || v_venta_id::text);
    INSERT INTO movimiento_inventario (insumo_id, venta_id, usuario_id, tipo, cantidad, motivo)
    SELECT r.insumo_id, v_venta_id, p_usuario_id, 'venta', (r.cantidad_requerida * v_cant), 'receta venta ' || v_venta_id::text || ' prod ' || v_pid::text
    FROM receta_insumo r WHERE r.producto_id = v_pid;
    UPDATE insumo i SET stock = stock - (r.cantidad_requerida * v_cant)
    FROM receta_insumo r WHERE r.producto_id = v_pid AND i.id_insumo = r.insumo_id;
    IF EXISTS (SELECT 1 FROM insumo i JOIN receta_insumo r ON r.insumo_id = i.id_insumo WHERE r.producto_id = v_pid AND i.stock < 0) THEN
      RAISE EXCEPTION 'STOCK_INSUFICIENTE insumo receta %', v_pid;
    END IF;
  END LOOP;
  FOR v_pago IN SELECT * FROM jsonb_array_elements(p_pagos) LOOP
    INSERT INTO pago (venta_id, metodo_pago_id, monto, referencia, estado)
    VALUES (v_venta_id, (v_pago->>'metodo_pago_id')::uuid, (v_pago->>'monto')::numeric, NULLIF(v_pago->>'referencia',''), 'confirmado');
  END LOOP;
  IF p_cliente_id IS NOT NULL THEN
    IF v_canje > 0 THEN
      INSERT INTO movimiento_puntos (cliente_id, venta_id, puntos, tipo, motivo)
      VALUES (p_cliente_id, v_venta_id, -v_canje, 'canje', 'canje venta ' || v_venta_id::text);
      UPDATE cliente SET puntos_fidelidad = puntos_fidelidad - v_canje WHERE id_cliente = p_cliente_id;
    END IF;
    INSERT INTO movimiento_puntos (cliente_id, venta_id, puntos, tipo, motivo)
    VALUES (p_cliente_id, v_venta_id, floor(v_total)::int, 'acumulacion', 'venta ' || v_venta_id::text);
    UPDATE cliente SET puntos_fidelidad = puntos_fidelidad + floor(v_total)::int WHERE id_cliente = p_cliente_id;
  END IF;
  INSERT INTO auditoria_accion (usuario_id, accion, entidad, entidad_id, resultado, detalle)
  VALUES (p_usuario_id, 'REGISTRAR_VENTA', 'venta', v_venta_id, 'exitoso', jsonb_build_object('total', v_total, 'items', p_items));
  RETURN v_venta_id;
END; $$;
REVOKE ALL ON FUNCTION public.registrar_venta(uuid,uuid,uuid,jsonb,numeric,jsonb,text,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_venta(uuid,uuid,uuid,jsonb,numeric,jsonb,text,integer) TO service_role;
