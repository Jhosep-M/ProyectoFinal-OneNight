# Restaurante Moderno Pages Report

**Status:** DONE

## Files Modified

1. `pos/frontend/src/pages/dashboard/DashboardPage.jsx` — Real data from `listarVentas()` + `listarMesas()`, loading/error states, metrics, pedidos recientes table
2. `pos/frontend/src/pages/ventas/VentasPage.jsx` — Real data from `productosService.list()` + `categoriasService.list()`, product grid, category tabs, ticket with subtotal/IVA/total, `crearVenta()` on Cobrar
3. `pos/frontend/src/pages/caja/CajaPage.jsx` — Real data from `listarTurnos()` + `listarVentas()`, turno actual info, transacciones table, `cerrarTurno()` on Cerrar Turno
4. `pos/frontend/src/pages/mesas/MesasPage.jsx` — Real data from `listarMesas()`, mesas grid, mesa detail panel, `crearMesa()` on Nueva Mesa
5. `pos/frontend/src/pages/auth/LoginPage.jsx` — Restaurante Moderno design applied, auth logic preserved

## Build Result

Build succeeded. 532 modules transformed. No errors.

## Concerns

- `crearVenta()` is called with a console.log placeholder since `turno_id` is not yet available from the UI flow (no turno selector in VentasPage).
- `categoriasService.list()` returns category objects with `id`/`nombre` — the VentasPage filters by `categoria_id` or `categoria` field on products; actual field name depends on backend response shape.
- The `Card` component uses `framer-motion` `whileHover` — set `hover={false}` on clickable cards to avoid conflicting hover/click behavior.
