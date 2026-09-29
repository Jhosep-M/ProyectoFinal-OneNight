-- Migration 003 - P4 autoriza + seeds RBAC (Persona 4)
-- Corrige deriva: la DB viva tiene usuario_tiene_permiso(text) con el uid
-- tomado del contexto de sesion, pero el middleware authorize() usa
-- usuario_tiene_permiso(uid, permiso). Desde el backend (conexion directa PG
-- sin contexto JWT de sesion) eso siempre da false y todo authorize falla.
-- Se reemplaza por la version de 2 args con uid explicito
-- (igual que 002-p4-security.sql) y se siembran los permisos que
-- las rutas exigen. Idempotente: re-ejecutable sin duplicar.

-- Se agrega la version de 2 args como SOBRECARGA (overload): la version de
-- 1 arg se conserva porque ~100 policies RLS la usan con el contexto de
-- sesion (via PostgREST). El backend usa la de 2 args con uid explicito
-- porque su conexion directa PG no tiene contexto JWT de sesion.
-- NO borrar la de 1 arg: DROP ... rompería todas esas policies.

-- 2. Funcion de 2 args: uid explicito como parametro.
CREATE OR REPLACE FUNCTION public.usuario_tiene_permiso(p_uid UUID, p_permiso TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM usuario u
    JOIN rol r ON r.id_rol = u.rol_id
    JOIN rol_permiso rp ON rp.rol_id = r.id_rol
    JOIN permiso p ON p.id_permiso = rp.permiso_id
    WHERE u.id_usuario = p_uid
      AND u.estado = 'activo'
      AND r.estado = 'activo'
      AND p.nombre = p_permiso
  );
$$;

-- 3. REVOKE defensivo: las funciones de negocio solo via backend (postgres /
-- service_role). El checker si queda ejecutable por roles de app.
REVOKE ALL ON FUNCTION public.registrar_venta(uuid,uuid,uuid,jsonb,numeric,jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.anular_venta(uuid,uuid,varchar) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.procesar_devolucion(uuid,uuid,integer,uuid,varchar) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cerrar_turno(uuid,numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.usuario_tiene_permiso(uuid,text) TO authenticated, service_role;

-- 4. Permisos que las rutas exigen y no estaban sembrados.
INSERT INTO permiso (nombre, descripcion, modulo) VALUES
  ('pedido.consultar', 'Ver pedidos', 'pedidos'),
  ('pedido.crear', 'Crear pedidos', 'pedidos'),
  ('pedido.gestionar', 'Actualizar/cerrar pedidos', 'pedidos'),
  ('pago.consultar', 'Ver pagos', 'pagos'),
  ('pago.gestionar', 'Registrar pagos', 'pagos'),
  ('devolucion.consultar', 'Ver devoluciones', 'devoluciones'),
  ('devolucion.procesar', 'Procesar devoluciones', 'devoluciones'),
  ('mesa.consultar', 'Ver mesas', 'mesas'),
  ('mesa.gestionar', 'Crear mesas', 'mesas'),
  ('integracion.consultar', 'Ver cola de integracion', 'integracion'),
  ('integracion.gestionar', 'Reintentar cola', 'integracion'),
  ('alerta.recibir', 'Recibir alertas de Monitoreo', 'integracion')
ON CONFLICT (nombre) DO NOTHING;

-- 5. Grants por rol (sin duplicar). Convencion existente:
-- cajero/mesero operan; solo supervisor/admin gestionan y anulan.
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id_rol, p.id_permiso FROM rol r, permiso p
WHERE p.nombre IN ('pedido.consultar','pedido.crear','pago.consultar','pago.gestionar',
                   'devolucion.consultar','mesa.consultar')
  AND r.nombre IN ('cajero','supervisor','admin')
  AND NOT EXISTS (SELECT 1 FROM rol_permiso x WHERE x.rol_id = r.id_rol AND x.permiso_id = p.id_permiso);

INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id_rol, p.id_permiso FROM rol r, permiso p
WHERE p.nombre IN ('pedido.consultar','pedido.crear','mesa.consultar')
  AND r.nombre = 'mesero'
  AND NOT EXISTS (SELECT 1 FROM rol_permiso x WHERE x.rol_id = r.id_rol AND x.permiso_id = p.id_permiso);

INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id_rol, p.id_permiso FROM rol r, permiso p
WHERE p.nombre IN ('pedido.gestionar','devolucion.procesar','mesa.gestionar','integracion.consultar')
  AND r.nombre IN ('supervisor','admin')
  AND NOT EXISTS (SELECT 1 FROM rol_permiso x WHERE x.rol_id = r.id_rol AND x.permiso_id = p.id_permiso);

INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id_rol, p.id_permiso FROM rol r, permiso p
WHERE p.nombre IN ('integracion.gestionar','alerta.recibir')
  AND r.nombre = 'admin'
  AND NOT EXISTS (SELECT 1 FROM rol_permiso x WHERE x.rol_id = r.id_rol AND x.permiso_id = p.id_permiso);
