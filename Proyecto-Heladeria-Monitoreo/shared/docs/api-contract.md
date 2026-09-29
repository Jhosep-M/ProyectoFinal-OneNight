# Contratos API

## Base URL

```
/api/v1
```

## Autenticación

Todos los endpoints requieren header `Authorization: Bearer <JWT>` (Supabase Auth).

## Endpoints

### Ventas

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/sales` | `venta.consultar` | Listar ventas |
| POST | `/sales` | `venta.crear` | Crear venta |
| POST | `/sales/:id/anular` | `venta.anular` | Anular venta |

### Turnos de Caja

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/shifts` | `turno.consultar` | Listar turnos |
| POST | `/shifts` | `turno.abrir` | Abrir turno |
| POST | `/shifts/:id/cerrar` | `turno.cerrar` | Cerrar turno |

### Pedidos

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/orders` | `pedido.consultar` | Listar pedidos |
| POST | `/orders` | `pedido.crear` | Crear pedido |
| PATCH | `/orders/:id` | `pedido.gestionar` | Actualizar pedido |
| POST | `/orders/:id/cobrar` | `pedido.gestionar` | Cobrar pedido |

### Mesas

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/mesas` | `mesa.consultar` | Listar mesas |
| POST | `/mesas` | `mesa.gestionar` | Crear mesa |
| PATCH | `/mesas/:id` | `mesa.gestionar` | Actualizar mesa |
| DELETE | `/mesas/:id` | `mesa.gestionar` | Eliminar mesa |

### Productos

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/products` | `producto.consultar` | Listar productos |
| POST | `/products` | `producto.gestionar` | Crear producto |
| PATCH | `/products/:id` | `producto.gestionar` | Actualizar producto |
| DELETE | `/products/:id` | `producto.gestionar` | Inactivar producto |

### Categorías

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/categories` | `producto.consultar` | Listar categorías |
| POST | `/categories` | `producto.gestionar` | Crear categoría |
| PATCH | `/categories/:id` | `producto.gestionar` | Actualizar categoría |
| DELETE | `/categories/:id` | `producto.gestionar` | Inactivar categoría |

### Inventario

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/inventory/insumos` | `inventario.consultar` | Listar insumos |
| POST | `/inventory/insumos` | `inventario.movimiento` | Crear insumo |
| PATCH | `/inventory/insumos/:id` | `inventario.movimiento` | Actualizar insumo |
| GET | `/inventory/movimientos` | `inventario.consultar` | Listar movimientos |
| POST | `/inventory/movimientos` | `inventario.movimiento` | Registrar movimiento |

### Proveedores

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/suppliers` | `proveedor.consultar` | Listar proveedores |
| POST | `/suppliers` | `proveedor.gestionar` | Crear proveedor |
| PATCH | `/suppliers/:id` | `proveedor.gestionar` | Actualizar proveedor |
| DELETE | `/suppliers/:id` | `proveedor.gestionar` | Inactivar proveedor |

### Clientes

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/customers` | `cliente.consultar` | Listar clientes |
| GET | `/customers/:id` | `cliente.consultar` | Ver cliente con puntos |
| POST | `/customers` | `cliente.gestionar` | Crear cliente |
| PATCH | `/customers/:id` | `cliente.gestionar` | Actualizar cliente |

### Pagos

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/payments` | `pago.consultar` | Listar pagos |
| GET | `/payments/metodos` | `pago.consultar` | Listar métodos de pago |
| POST | `/payments` | `pago.gestionar` | Crear pago |

### Devoluciones

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/returns` | `devolucion.consultar` | Listar devoluciones |
| POST | `/returns` | `devolucion.procesar` | Procesar devolución |

### Promociones

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/promotions` | `promocion.consultar` | Listar promociones |
| GET | `/promotions/:id` | `promocion.consultar` | Ver promoción con productos |
| POST | `/promotions` | `promocion.gestionar` | Crear promoción |
| PATCH | `/promotions/:id` | `promocion.gestionar` | Actualizar promoción |

### Usuarios

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/users` | `usuario.gestionar` | Listar usuarios |
| GET | `/users/:id` | `usuario.gestionar` | Ver usuario |
| POST | `/users` | `usuario.gestionar` | Crear usuario |
| PATCH | `/users/:id` | `usuario.gestionar` | Actualizar usuario |

### Auditoría

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/audit` | `auditoria.consultar` | Listar acciones (con filtros) |

### Integración

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/integrations` | `integracion.consultar` | Listar cola de integración |
| POST | `/integrations/:id/reintentar` | `integracion.gestionar` | Reintentar envío |
| POST | `/integrations/alerts` | API-key | Recibir alerta de Monitoreo |

### Salud

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | Health check |
