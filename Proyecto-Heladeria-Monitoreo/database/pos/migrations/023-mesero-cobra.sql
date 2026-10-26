-- 023 — Mesero cobra sobre turno abierto de caja (Opción A).
-- Otorga a mesero venta.crear + pago.consultar (solo lectura de métodos).
-- Idempotente. El mesero NO abre/cierra/consulta turnos ni anula ventas.
-- El cobro usa GET /shifts/abierto (turno de caja más reciente) y
-- POST /orders/:id/cobrar o POST /sales con ese turno_id.
-- registrar_venta solo exige turno abierto, no dueño; la auditoría
-- registra p_usuario_id=mesero + venta.turno_id=caja.

-- 1. Asegura permisos (ya existen en 002/003, pero idempotente por si acaso).
INSERT INTO permiso (nombre, descripcion, modulo) VALUES
  ('venta.crear', 'Crear ventas / cobrar', 'ventas'),
  ('pago.consultar', 'Ver pagos y métodos', 'pagos')
ON CONFLICT (nombre) DO NOTHING;

-- 2. Grants mesero (sin duplicar).
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id_rol, p.id_permiso FROM rol r, permiso p
WHERE r.nombre = 'mesero'
  AND p.nombre IN ('venta.crear', 'pago.consultar')
  AND NOT EXISTS (SELECT 1 FROM rol_permiso x WHERE x.rol_id = r.id_rol AND x.permiso_id = p.id_permiso);
