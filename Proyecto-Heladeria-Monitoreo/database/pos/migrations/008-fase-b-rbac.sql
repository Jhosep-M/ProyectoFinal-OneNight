-- Fase B — RBAC completo POS (Persona 1/2/4).
-- Idempotente: re-ejecutable sin duplicar (ON CONFLICT DO NOTHING + NOT EXISTS).
-- Cubre todos los permisos que las rutas de posBackend exigen y que 002/003 no sembraban,
-- incluido turno.cerrar.todos (exigido por cerrar_turno(uuid,numeric,uuid) de Fase A).

-- 1. Permisos faltantes.
INSERT INTO permiso (nombre, descripcion, modulo) VALUES
  ('venta.consultar', 'Ver ventas', 'ventas'),
  ('turno.consultar', 'Ver turnos propios', 'caja'),
  ('turno.consultar.todos', 'Ver turnos de todos', 'caja'),
  ('turno.cerrar.todos', 'Cerrar turnos ajenos', 'caja'),
  ('producto.consultar', 'Ver productos', 'catalogo'),
  ('producto.gestionar', 'Crear/editar productos', 'catalogo'),
  ('inventario.consultar', 'Ver inventario', 'inventario'),
  ('inventario.movimiento', 'Registrar movimientos', 'inventario'),
  ('cliente.consultar', 'Ver clientes', 'clientes'),
  ('cliente.gestionar', 'Crear/editar clientes', 'clientes'),
  ('promocion.consultar', 'Ver promociones', 'promociones'),
  ('promocion.gestionar', 'Crear/editar promociones', 'promociones'),
  ('configuracion.consultar', 'Ver configuracion', 'configuracion'),
  ('configuracion.gestionar', 'Editar configuracion', 'configuracion'),
  ('auditoria.consultar', 'Ver auditoria', 'auditoria'),
  ('usuario.consultar', 'Ver usuarios', 'usuarios'),
  ('usuario.gestionar', 'Crear/editar usuarios', 'usuarios')
ON CONFLICT (nombre) DO NOTHING;

-- 2. Grants por rol (matriz Fase B). Cajero/mesero operan; inventario gestiona stock;
-- solo supervisor/admin anulan, cierran, gestionan y auditan.
-- cajero
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id_rol, p.id_permiso FROM rol r, permiso p
WHERE r.nombre = 'cajero'
  AND p.nombre IN ('venta.consultar','venta.crear','turno.consultar','turno.abrir',
    'producto.consultar','pedido.consultar','pedido.crear',
    'pago.consultar','pago.gestionar','mesa.consultar','cliente.consultar')
  AND NOT EXISTS (SELECT 1 FROM rol_permiso x WHERE x.rol_id = r.id_rol AND x.permiso_id = p.id_permiso);

-- mesero
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id_rol, p.id_permiso FROM rol r, permiso p
WHERE r.nombre = 'mesero'
  AND p.nombre IN ('pedido.consultar','pedido.crear','mesa.consultar','producto.consultar')
  AND NOT EXISTS (SELECT 1 FROM rol_permiso x WHERE x.rol_id = r.id_rol AND x.permiso_id = p.id_permiso);

-- inventario
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id_rol, p.id_permiso FROM rol r, permiso p
WHERE r.nombre = 'inventario'
  AND p.nombre IN ('producto.consultar','producto.gestionar','inventario.consultar',
    'inventario.movimiento','promocion.consultar','cliente.consultar')
  AND NOT EXISTS (SELECT 1 FROM rol_permiso x WHERE x.rol_id = r.id_rol AND x.permiso_id = p.id_permiso);

-- supervisor
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id_rol, p.id_permiso FROM rol r, permiso p
WHERE r.nombre = 'supervisor'
  AND p.nombre IN ('venta.consultar','venta.crear','venta.anular',
    'turno.consultar','turno.consultar.todos','turno.abrir','turno.cerrar',
    'producto.consultar','producto.gestionar','inventario.consultar','inventario.movimiento',
    'cliente.consultar','cliente.gestionar','pedido.consultar','pedido.crear','pedido.gestionar',
    'pago.consultar','pago.gestionar','mesa.consultar','mesa.gestionar',
    'devolucion.consultar','devolucion.procesar','promocion.consultar','promocion.gestionar',
    'usuario.consultar','auditoria.consultar','integracion.consultar','configuracion.consultar')
  AND NOT EXISTS (SELECT 1 FROM rol_permiso x WHERE x.rol_id = r.id_rol AND x.permiso_id = p.id_permiso);

-- admin: todo lo anterior + gestión total
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id_rol, p.id_permiso FROM rol r, permiso p
WHERE r.nombre = 'admin'
  AND p.nombre IN ('venta.consultar','venta.crear','venta.anular',
    'turno.consultar','turno.consultar.todos','turno.abrir','turno.cerrar','turno.cerrar.todos',
    'producto.consultar','producto.gestionar','inventario.consultar','inventario.movimiento',
    'cliente.consultar','cliente.gestionar','pedido.consultar','pedido.crear','pedido.gestionar',
    'pago.consultar','pago.gestionar','mesa.consultar','mesa.gestionar',
    'devolucion.consultar','devolucion.procesar','promocion.consultar','promocion.gestionar',
    'usuario.consultar','usuario.gestionar','auditoria.consultar',
    'integracion.consultar','integracion.gestionar','alerta.recibir',
    'configuracion.consultar','configuracion.gestionar')
  AND NOT EXISTS (SELECT 1 FROM rol_permiso x WHERE x.rol_id = r.id_rol AND x.permiso_id = p.id_permiso);
