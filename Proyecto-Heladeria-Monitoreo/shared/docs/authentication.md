# Autenticación y Autorización

## Autenticación

- Supabase Auth administra las credenciales (email/password)
- El frontend obtiene un JWT de Supabase y lo envía como `Authorization: Bearer <token>`
- El backend valida el JWT con `authenticateJWT` (middleware)
- El `userId` siempre se deriva del JWT, nunca del body

## Autorización (RBAC)

- Tablas: `usuario`, `rol`, `permiso`, `rol_permiso`
- El middleware `authorize(permiso)` verifica permisos vía `usuario_tiene_permiso(uid, permiso)`
- La función PG `usuario_tiene_permiso` tiene 2 args (uid + permiso) y es `SECURITY DEFINER`
- Las políticas RLS usan la sobrecarga de 1 arg con `auth.uid()`

## Permisos por módulo

- `venta.*` — crear, consultar, anular
- `turno.*` — abrir, cerrar, consultar
- `caja.*` — consultar
- `cliente.*` — consultar, gestionar
- `producto.*` — consultar, gestionar
- `inventario.*` — consultar, movimiento
- `pago.*` — consultar, gestionar
- `devolucion.*` — consultar, procesar
- `promocion.*` — consultar, gestionar
- `usuario.*` — gestionar
- `auditoria.*` — consultar
- `integracion.*` — consultar, gestionar
- `alerta.*` — recibir
