-- Migration 001 - V2.1 DDL complemento: CHECKs, UNIQUEs, indices parciales, FK auth.users, RLS y search_path
-- Aplica sobre las 31 tablas creadas por Sequelize sync. Ejecutar con psql o supabase db push.

-- FK usuario -> auth.users (Global Constraint: usuario sin passwordHash, id_usuario referencia auth.users.id)
ALTER TABLE public.usuario
  ADD CONSTRAINT fk_usuario_auth FOREIGN KEY (id_usuario) REFERENCES auth.users(id) ON DELETE CASCADE;

-- CHECKs de negocio
ALTER TABLE public.producto ADD CONSTRAINT chk_producto_precio_pos CHECK (precio > 0);
ALTER TABLE public.producto ADD CONSTRAINT chk_producto_stock_nneg CHECK (stock >= 0);
ALTER TABLE public.producto ADD CONSTRAINT chk_producto_estado CHECK (estado IN ('activo','inactivo'));

ALTER TABLE public.usuario ADD CONSTRAINT chk_usuario_estado CHECK (estado IN ('activo','inactivo'));
ALTER TABLE public.pedido ADD CONSTRAINT chk_pedido_estado CHECK (estado IN ('abierto','en_preparacion','entregado','cobrado','cancelado'));
ALTER TABLE public.turno_caja ADD CONSTRAINT chk_turno_estado CHECK (estado IN ('abierto','cerrado'));
ALTER TABLE public.detalle_pedido ADD CONSTRAINT chk_detalle_cantidad_pos CHECK (cantidad > 0);
ALTER TABLE public.detalle_pedido ADD CONSTRAINT chk_detalle_precio_pos CHECK (precio_unitario > 0);
ALTER TABLE public.cola_integracion ADD CONSTRAINT chk_cola_estado CHECK (estado IN ('pendiente','procesando','enviado','error'));
ALTER TABLE public.consumo_reportado ADD CONSTRAINT chk_consumo_estado CHECK (estado IN ('pendiente','enviado','error'));

-- UNIQUE constraints que faltaban a nivel PG (Sequelize ya declara algunos, pero se asegura en PG)
CREATE UNIQUE INDEX IF NOT EXISTS ux_usuario_email ON public.usuario(email);
CREATE UNIQUE INDEX IF NOT EXISTS ux_proveedor_nit ON public.proveedor(nit) WHERE nit IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_cola_idempotency ON public.cola_integracion(idempotency_key);

-- Indices parciales exigidos por spec V2.1 §7 y §22
CREATE UNIQUE INDEX IF NOT EXISTS ux_turno_abierto ON public.turno_caja(usuario_id) WHERE estado='abierto';
CREATE UNIQUE INDEX IF NOT EXISTS ux_consumo_turno_recurso ON public.consumo_reportado(turno_id, tipo_recurso) WHERE turno_id IS NOT NULL;

-- Indices para auditoria y busquedas frecuentes
CREATE INDEX IF NOT EXISTS ix_auditoria_fecha ON public.auditoria_accion(fecha);
CREATE INDEX IF NOT EXISTS ix_venta_fecha ON public.venta(fecha);

-- RLS hardening (§65): revocar anon y habilitar RLS; politicas restrictivas por defecto
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, PUBLIC;
ALTER TABLE public.usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.producto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turno_caja ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cola_integracion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumo_reportado ENABLE ROW LEVEL SECURITY;

-- Politica ejemplo: solo service_role / SECURITY DEFINER functions acceden; anon bloqueado
-- No usar USING(true). Usar USING(false) por defecto y exponer via functions con SECURITY DEFINER
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='p_no_anon_usuario') THEN
    CREATE POLICY p_no_anon_usuario ON public.usuario FOR ALL USING (false) WITH CHECK (false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='p_no_anon_producto') THEN
    CREATE POLICY p_no_anon_producto ON public.producto FOR ALL USING (false) WITH CHECK (false);
  END IF;
END $$;

-- Todas las functions SECURITY DEFINER deben fijar search_path
-- Ejemplo (ajustar nombres reales de functions del spec):
-- ALTER FUNCTION public.registrar_venta(...) SET search_path = public;
-- ALTER FUNCTION public.cerrar_turno(...) SET search_path = public;
-- ALTER FUNCTION public.procesar_devolucion(...) SET search_path = public;
