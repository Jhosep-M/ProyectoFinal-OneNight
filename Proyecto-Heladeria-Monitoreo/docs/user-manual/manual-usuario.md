# Manual de Usuario — POS Heladería

## Inicio de Sesión

1. Abrir el POS en el navegador
2. Ingresar correo y contraseña
3. Click en "Entrar"

El menú lateral muestra los módulos disponibles según el rol.

## Módulo Ventas

### Crear una venta

1. Ir a **Ventas**
2. Ingresar el **Turno ID** (UUID del turno abierto)
3. Agregar productos: click en **+ producto**, ingresar `producto_id` y cantidad
4. Agregar pagos: click en **+ pago (dividido)**, seleccionar método y monto
5. Click en **Cobrar**

### Anular una venta

1. En la lista de ventas, click en **Anular** junto a la venta activa
2. Ingresar el motivo (mínimo 5 caracteres)
3. Confirmar

La venta queda como `anulada` y se restaura el stock automáticamente.

### Devolución

1. Ir a la sección **Devolución**
2. Ingresar `venta_id`, `producto_id`, cantidad y motivo
3. Click en **Procesar**

## Módulo Caja

### Abrir turno

1. Ir a **Caja**
2. Ingresar el monto inicial en efectivo
3. Click en **Abrir**

Solo puede tener un turno abierto por cajero.

### Cerrar turno

1. En la lista de turnos, click en **Cerrar** junto al turno abierto
2. Ingresar el efectivo real en caja
3. Confirmar

El sistema calcula la diferencia entre lo esperado y lo real. Si hay diferencia, se registra.

## Módulo Pedidos

### Crear pedido

1. Ir a **Pedidos**
2. Seleccionar la mesa
3. Agregar productos con cantidad
4. Click en **Crear pedido**

### Cambiar estado

- **Preparar**: pasa de `pendiente` a `en_preparacion`
- **Listo**: pasa de `en_preparacion` a `listo`
- **Cobrar**: cobra el pedido y lo marca como `cobrado`

## Módulo Mesas

### Crear mesa

1. Ir a **Mesas**
2. Ingresar el número de mesa
3. Click en **Crear**

## Consideraciones

- Todos los cambios se guardan automáticamente
- Las ventas anuladas permanecen en el historial
- Las devoluciones restauran el stock de productos e insumos
- Los puntos de fidelidad se acumulan automáticamente (1 punto cada 10 de total)
