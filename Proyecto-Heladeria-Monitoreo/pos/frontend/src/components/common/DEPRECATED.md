# components/common/ — LEGACY

> No borrar este directorio: varios módulos aún lo importan
> (`RequireAuth`, `RequirePermiso`, `Select`, `Textarea`, etc.).
> Borrarlo rompería esos imports.

## Regla vigente (Fase 4)

- **`components/ui/` es el sistema canónico** para UI nueva: `Button`, `Card`,
  `Badge`, `Alert`, `EmptyState`, `Input`, `Modal`, `Skeleton`, `DataTable`, `Avatar`.
- **`components/common/` es legacy**: no agregar componentes nuevos aquí.
- Las páginas nuevas **`Devoluciones.jsx`** y **`Proveedores.jsx`** usan `ui/`.
- **`VentasPage.jsx`** ya migró `Input` de `common/` a `ui/` (API compatible).

## Migración gradual

Cuando se toque un archivo que importe de `common/` un componente que ya
exista en `ui/` (`Button`, `Card`, `Badge`, `Input`, `EmptyState`, `Skeleton`,
`Alert`), migrar ese import a `ui/` en el mismo cambio. No hacer migraciones
masivas: un cambio pequeño por vez, verificando `npm run build` + tests.

Excepciones (quedan en `common/` hasta tener reemplazo en `ui/`):
`RequireAuth`, `RequirePermiso`, `Select`, `Textarea`.
