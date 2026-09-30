# Spec: Recetas v2 — Gestión completa Master-Detail (POS)

**Fecha:** 2026-09-30
**Estado:** Aprobado por usuario (alcance: gestión completa, UX: master-detail, extras: costo + alertas)
**Owner:** Persona 2 — POS Inventario/Productos/Clientes
**Relacionado:** AGENTS.md §5.2, §9, §15 / `pos/posBackend/src/models/RecetaInsumo.js` / `database/pos/functions/001-registrar_venta.sql`

---

## 1. Objetivo

Reemplazar el placeholder actual (`pos/frontend/src/pages/catalogo/RecetasClientesPromos.jsx:14` — solo lista `GET /api/v1/products`) por una pantalla de gestión completa de recetas producto → insumos, manteniendo el design system existente (Card, Badge, Alert, Skeleton, EmptyState, RequirePermiso) y sin duplicar lógica de stock (fuente de verdad: funciones PG).

No crear entidades duplicadas (`ProductoPOS`, `RecetaPOS`, etc. — AGENTS.md §15).

## 2. Alcance

**Incluye:**
- Listar productos activos con buscador + badge `Sin receta` / `N insumos`.
- Ver receta por producto: tabla insumos (nombre, unidad, cantidad_requerida, stock actual, alerta).
- Crear / editar / eliminar línea de receta (producto_id + insumo_id + cantidad_requerida).
- Costo estimado por porción + porciones posibles `min(stock / cantidad_requerida)`.
- Alertas: stock-bajo, vencido, no_disponible (reusa `utils/inventario.js:getAlertaInsumo`).
- Validación frontend + backend, auditoría, permisos RBAC.
- Loading (Skeleton), vacío (EmptyState), errores (Alert).

**No incluye (YAGNI):**
- Nueva librería UI (se evaluó `pick-ui-library`, se descarta: ya existe DS propio).
- Animaciones complejas (postergar a skill `impeccable` / `animate` tras MVP).
- Costeo contable real (sin precio de compra por insumo en modelo actual; costo = informativo si hay dato, si no `—`).
- Clonado/duplicado de receta entre productos (fase 2).
- Backend de recetas en este spec de frontend — se define contrato para Persona 4 / backend, pero la implementación backend va en plan separado.

## 3. UX — Master-Detail (opción A elegida)

```
+----------+--------------------------------+-------------------------------+
| Sidebar  | Productos (30%)              | Receta de [Cono Simple] (70%) |
| Helados  | [Buscar...]                | 4 insumos · Costo Bs X ·      |
| Pariente | • Cono Simple (3)          | Porciones posibles: 42        |
|          | • Banana Split (5)         | +-----------------------------+|
|          | • Sundae (Sin receta)      | | Insumo | Cant | Stock| ...|||
+----------+--------------------------------+-------------------------------+
```

- Desktop: 2 columnas. Mobile (<900px): apilado, lista arriba, detalle abajo; scroll al seleccionar.
- Header: `h1 Recetas` + `p.text-muted` + `Badge warning {n} sin receta`.
- Lista izquierda: `Card title="Productos"` + `Input buscar` + filas clicables (activa con clase `selected`), foto 32px via `resolveProductoImagen`.
- Detalle derecha: `Card title="Receta de X"` + actions (Badge costo, Badge porciones) + tabla `data-table` + formulario inline `Agregar insumo` (Select insumo + Input cantidad + Button).
- Fila insumo: nombre, `cantidad_requerida + unidad`, stock + Badge Bajo/Vencido, stepper editar (Input number + Guardar/Cancelar), botón Eliminar (confirm).
- Vacío: `EmptyState title="Sin receta" description="Este producto aún no descuenta insumos..."` + CTA enfocar formulario.
- Se descartó: B tabla expandible (no escala, ancho excesivo), C modal editor (rompe comparación).

## 4. Arquitectura frontend

**Archivos nuevos:**
- `pos/frontend/src/services/recetasService.js` — `list(producto_id), create(data), update(id,data), remove(id)`.
- `pos/frontend/src/pages/catalogo/RecetasPage.jsx` — container master-detail (reemplaza export `Recetas` en `RecetasClientesPromos.jsx`, manteniendo `Clientes` y `Promociones` intactos).
- `pos/frontend/src/pages/catalogo/components/RecetaPanel.jsx` — detalle + tabla + formulario.
- `pos/frontend/src/pages/catalogo/components/RecetaCostoBar.jsx` — costo + porciones (pura, testeable).
- `pos/frontend/src/pages/catalogo/__tests__/RecetasPage.test.jsx` — tests RTL.

**Reuso estricto:** `Card, Badge, Alert, Input, Select, Button, Skeleton, EmptyState, RequirePermiso`, `productosService.list()`, `inventarioService.insumos()`, `formatCurrency`, `resolveProductoImagen`, `getAlertaInsumo/isStockBajo/isVencido`.

**Estado:** `productos, insumos, receta, selectedId, loading, alert, form, editandoId` con `useState/useEffect/useMemo`. Sin Redux/Zustand (YAGNI).

## 5. Contrato API requerido (backend a crear — Persona 4)

Base: `/api/v1/recipes` (nuevo `posBackend/src/routes/recetas.js`, no existe hoy).

- `GET /api/v1/recipes?producto_id=<uuid>` → `[{id_receta, producto_id, insumo_id, cantidad_requerida, insumo_nombre, unidad_medida, stock, estado}]` — auth `producto.consultar`.
- `POST /api/v1/recipes` `{producto_id: uuid, insumo_id: uuid, cantidad_requerida: number>0}` → 201 — auth `producto.gestionar`, valida UUIDs existen, cantidad NUMERIC(14,4) >0, UNIQUE(producto,insumo) → 409 si duplica, `auditLog producto.receta.crear`.
- `PATCH /api/v1/recipes/:id` `{cantidad_requerida}` → 200 — auth `producto.gestionar`.
- `DELETE /api/v1/recipes/:id` → 200 — auth `producto.gestionar`, `auditLog`.
- Validación con zod (patrón `routes/products.js`, `routes/inventory.js`), queries parametrizadas, sin stack traces al cliente.
- Migración: ninguna (tabla `receta_insumo` ya existe + UNIQUE en `002-b2-uniques.sql`).

**Fallback temporal frontend:** si `GET /api/v1/recipes` → 404, mostrar EmptyState + mensaje `Backend de recetas pendiente` sin romper lista de productos.

## 6. Reglas de negocio frontend (no duplicar PG)

- No recalcular ni mutar stock desde frontend. Solo lectura de `stock` para `porciones = floor(min(stock_i / cantidad_requerida_i))`. Si algún insumo `stock <= 0` o `vencido`, porciones = 0 + Badge error.
- `cantidad_requerida`: number, step `0.0001`, min `0.0001`, max `999999`, 4 decimales. Error inline si inválido.
- Bloquear agregar insumo con `estado != disponible` (tooltip `No disponible / vencido`).
- Costo: `Σ cantidad_requerida * costo_unitario` si el insumo expone costo; si no, `—` (no inventar campo).
- Permisos: leer `producto.consultar` (ruta ya lo exige en `AppRoutes.jsx:43`), mutar envuelto en `<RequirePermiso permiso="producto.gestionar">`.

## 7. Manejo de errores

| Caso | UI |
|---|---|
| loading | 3× `Skeleton height={36}` en ambas columnas |
| receta vacía | `EmptyState Sin receta` + CTA |
| 409 duplicado | `Alert error "Ese insumo ya está en la receta"` + resaltar fila |
| 422 cantidad | `Alert error` + borde rojo en Input |
| 401/403 | `Alert error` + ocultar formularios (RequirePermiso) |
| backend 404 /recipes | `Alert info "API de recetas no disponible aún"` + solo lectura productos |
| network | `Alert error e.message` + botón Reintentar (`recargar`) |

## 8. Pruebas mínimas (Persona 2 §12)

1. Render lista productos + selección cambia detalle.
2. Agregar insumo válido → aparece en tabla + toast success.
3. Duplicado → 409 → Alert, sin fila duplicada.
4. Cantidad 0/negativa → bloqueo frontend, sin llamada API.
5. Editar cantidad inline → PATCH + recalcula porciones.
6. Eliminar → confirm + DELETE + EmptyState si queda vacía.
7. Insumo vencido → Badge error + botón agregar deshabilitado.
8. Sin permiso `producto.gestionar` → formularios ocultos.

## 9. Criterios de terminado (AGENTS.md §19)

Código + validación + autorización + persistencia (vía API) + manejo errores + auditoría (backend) + pruebas RTL + este spec. Sin secretos, sin `userId` del frontend (JWT backend), sin FK cruzadas POS/Monitoreo.

---

## Self-review spec (2026-09-30)

- [x] Sin TBD/TODO: todos los campos, rutas y componentes concretos.
- [x] Consistencia: master-detail en §3 = archivos en §4 = contrato en §5; costo/porciones definidos igual en §4 y §6.
- [x] Alcance: una sola pantalla + 4 archivos nuevos + 1 service; duplicar receta y costeo real explícitamente fuera (fase 2).
- [x] Ambigüedad: `cantidad_requerida > 0` con step/min/max explícitos; costo `—` si no hay dato (no se inventa columna); fallback 404 definido.
