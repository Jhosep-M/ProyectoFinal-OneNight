# Autorización (RBAC)

## Modelo

```
Usuario → Rol → RolPermiso → Permiso
```

- **Usuario**: tabla `usuario`, FK a `auth.users` (Supabase Auth)
- **Rol**: tabla `rol` (cajero, mesero, supervisor, admin)
- **Permiso**: tabla `permiso` (nombre único, ej. `venta.crear`)
- **RolPermiso**: tabla `permiso` (relación rol-permiso)

## Middleware

```js
// authenticate.js — valida JWT de Supabase
authenticateJWT(req, res, next)

// authorize.js — verifica permiso
authorize('venta.crear')(req, res, next)
```

El middleware `authorize` consulta la función PG `usuario_tiene_permiso(uid, permiso)` que retorna `true/false`.

## Función PG

```sql
-- 2 args (usa el backend con conexión directa)
usuario_tiene_permiso(p_uid UUID, p_permiso TEXT) RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public;

-- 1 arg (usa RLS con auth.uid())
usuario_tiene_permiso(p_permiso TEXT) RETURNS BOOLEAN
```

## Permisos por módulo

| Módulo | Permisos |
|--------|----------|
| Venta | `venta.consultar`, `venta.crear`, `venta.anular` |
| Turno | `turno.consultar`, `turno.abrir`, `turno.cerrar`, `turno.consultar.todos` |
| Pedido | `pedido.consultar`, `pedido.crear`, `pedido.gestionar` |
| Mesa | `mesa.consultar`, `mesa.gestionar` |
| Producto | `producto.consultar`, `producto.gestionar` |
| Categoría | `categoria.consultar`, `categoria.gestionar` |
| Inventario | `inventario.consultar`, `inventario.movimiento` |
| Proveedor | `proveedor.consultar`, `proveedor.gestionar` |
| Cliente | `cliente.consultar`, `cliente.gestionar` |
| Pago | `pago.consultar`, `pago.gestionar` |
| Devolución | `devolucion.consultar`, `devolucion.procesar` |
| Promoción | `promocion.consultar`, `promocion.gestionar` |
| Usuario | `usuario.gestionar` |
| Auditoría | `auditoria.consultar` |
| Integración | `integracion.consultar`, `integracion.gestionar` |
| Alerta | `alerta.recibir` |

## Roles

| Rol | Permisos principales |
|-----|---------------------|
| Cajero | venta, turno, pedido, mesa, cliente, pago |
| Mesero | pedido, mesa |
| Supervisor | todo lo de cajero + inventario, proveedor, promoción |
| Admin | todos los permisos |
