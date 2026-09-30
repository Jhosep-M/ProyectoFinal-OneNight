-- Fase C — RLS completo POS.
-- Idempotente: re-ejecutable (guards IF NOT EXISTS / DROP POLICY IF EXISTS).
-- El backend conecta como owner (DATABASE_URL) y no se ve afectado; esto
-- protege la vía PostgREST/anon/authenticated. Sin políticas abiertas en ningún caso.

-- 1. Sobrecarga de 1 arg con auth.uid() para las policies (sesión PostgREST).
-- La de 2 args (uid explícito, backend) vive en 003/004 y no se toca.
CREATE OR REPLACE FUNCTION public.usuario_tiene_permiso(p_permiso TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM usuario u
    INNER JOIN rol r ON r.id_rol = u.rol_id
    INNER JOIN rol_permiso rp ON rp.rol_id = r.id_rol
    INNER JOIN permiso p ON p.id_permiso = rp.permiso_id
    WHERE u.id_usuario = auth.uid()
      AND u.estado = 'activo'
      AND r.estado = 'activo'
      AND p.nombre = p_permiso
  );
$$;
REVOKE ALL ON FUNCTION public.usuario_tiene_permiso(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.usuario_tiene_permiso(text) TO authenticated, service_role;

-- 2. Habilitar RLS en todas las tablas del dominio POS.
DO $$ DECLARE t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'usuario','rol','permiso','rol_permiso','turno_caja','venta','detalle_venta',
    'pago','metodo_pago','mesa','pedido','detalle_pedido','producto','categoria',
    'insumo','receta_insumo','proveedor','movimiento_inventario','promocion',
    'promocion_producto','devolucion','consumo_reportado','cola_integracion',
    'entrega_alerta','auditoria_accion','equipo_consumo','equipo_turno',
    'configuracion_pos','cliente','movimiento_puntos','alerta_pos'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- 3. Cierre por defecto: nada para anon/PUBLIC (el backend owner no se afecta).
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, PUBLIC;

-- 4. Policies documentadas (deny por defecto; solo lo listado se permite).
-- producto
DROP POLICY IF EXISTS producto_select ON public.producto;
CREATE POLICY producto_select ON public.producto FOR SELECT TO authenticated
  USING (public.usuario_tiene_permiso('producto.consultar'));
DROP POLICY IF EXISTS producto_insert ON public.producto;
CREATE POLICY producto_insert ON public.producto FOR INSERT TO authenticated
  WITH CHECK (public.usuario_tiene_permiso('producto.gestionar'));
DROP POLICY IF EXISTS producto_update ON public.producto;
CREATE POLICY producto_update ON public.producto FOR UPDATE TO authenticated
  USING (public.usuario_tiene_permiso('producto.gestionar'))
  WITH CHECK (public.usuario_tiene_permiso('producto.gestionar'));

-- movimiento_inventario: lectura + inserción; histórico inmutable (sin update/delete)
DROP POLICY IF EXISTS movimiento_inventario_select ON public.movimiento_inventario;
CREATE POLICY movimiento_inventario_select ON public.movimiento_inventario FOR SELECT TO authenticated
  USING (public.usuario_tiene_permiso('inventario.consultar'));
DROP POLICY IF EXISTS movimiento_inventario_insert ON public.movimiento_inventario;
CREATE POLICY movimiento_inventario_insert ON public.movimiento_inventario FOR INSERT TO authenticated
  WITH CHECK (public.usuario_tiene_permiso('inventario.movimiento'));

-- venta: lectura + inserción atada a turno abierto propio
DROP POLICY IF EXISTS venta_select ON public.venta;
CREATE POLICY venta_select ON public.venta FOR SELECT TO authenticated
  USING (public.usuario_tiene_permiso('venta.consultar'));
DROP POLICY IF EXISTS venta_insert ON public.venta;
CREATE POLICY venta_insert ON public.venta FOR INSERT TO authenticated
  WITH CHECK (
    public.usuario_tiene_permiso('venta.crear')
    AND EXISTS (
      SELECT 1 FROM turno_caja tc
      WHERE tc.id_turno = turno_id AND tc.usuario_id = auth.uid() AND tc.estado = 'abierto'
    )
  );

-- turno_caja: ver propio o con permiso global; abrir solo propio
DROP POLICY IF EXISTS turno_select ON public.turno_caja;
CREATE POLICY turno_select ON public.turno_caja FOR SELECT TO authenticated
  USING (usuario_id = auth.uid() OR public.usuario_tiene_permiso('turno.consultar.todos'));
DROP POLICY IF EXISTS turno_insert ON public.turno_caja;
CREATE POLICY turno_insert ON public.turno_caja FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid() AND public.usuario_tiene_permiso('turno.abrir'));

-- auditoria_accion: solo lectura con permiso; sin escrituras libres
DROP POLICY IF EXISTS auditoria_select ON public.auditoria_accion;
CREATE POLICY auditoria_select ON public.auditoria_accion FOR SELECT TO authenticated
  USING (public.usuario_tiene_permiso('auditoria.consultar'));
