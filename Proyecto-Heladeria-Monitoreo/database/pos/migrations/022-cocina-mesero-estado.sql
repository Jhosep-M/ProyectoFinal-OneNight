-- 022 — HU-04 Cocina + HU-11 Mesero (Persona 1/4).
-- Crea rol cocina y permiso pedido.estado. Idempotente.
-- cocina: solo ve pedidos/mesas/productos y avanza abierto -> en_preparacion -> listo.
-- Sin venta.* (no cobra, no ve caja), sin gestion total (no cancela).

-- 1. Rol cocina.
INSERT INTO rol (nombre, descripcion, estado) VALUES
  ('cocina', 'Cocina y preparacion', 'activo')
ON CONFLICT (nombre) DO NOTHING;

-- 2. Permiso de transicion de cocina.
INSERT INTO permiso (nombre, descripcion, modulo) VALUES
  ('pedido.estado', 'Avanzar estado en cocina', 'pedidos')
ON CONFLICT (nombre) DO NOTHING;

-- 3. Grants cocina (sin duplicar).
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id_rol, p.id_permiso FROM rol r, permiso p
WHERE r.nombre = 'cocina'
  AND p.nombre IN ('pedido.consultar', 'pedido.estado', 'mesa.consultar', 'producto.consultar')
  AND NOT EXISTS (SELECT 1 FROM rol_permiso x WHERE x.rol_id = r.id_rol AND x.permiso_id = p.id_permiso);

-- 4. Supervisor/admin tambien pueden avanzar estados (sin duplicar).
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id_rol, p.id_permiso FROM rol r, permiso p
WHERE r.nombre IN ('supervisor', 'admin')
  AND p.nombre = 'pedido.estado'
  AND NOT EXISTS (SELECT 1 FROM rol_permiso x WHERE x.rol_id = r.id_rol AND x.permiso_id = p.id_permiso);

-- 5. Mesero: asegura producto.consultar para la vista Mesero (read-only catalogo).
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id_rol, p.id_permiso FROM rol r, permiso p
WHERE r.nombre = 'mesero'
  AND p.nombre = 'producto.consultar'
  AND NOT EXISTS (SELECT 1 FROM rol_permiso x WHERE x.rol_id = r.id_rol AND x.permiso_id = p.id_permiso);
