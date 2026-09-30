# Arquitectura del POS

## Stack

- **Frontend**: React 18 + Vite + react-router-dom 6
- **Backend**: Node.js + Express 5 + Sequelize 6
- **Base de datos**: PostgreSQL (Supabase)
- **Auth**: Supabase Auth + JWT
- **ORM**: Sequelize
- **Validación**: Zod

## Capas del backend

```
routes → controllers → services → repositories → models
```

En la práctica, las rutas tienen handlers inline (no usan controllers como capa separada). Los controllers existen como capa de abstracción futura.

## Flujo de datos

1. **Frontend** → `apiFetch` (JWT Bearer) → **Backend**
2. **Backend** valida JWT → deriva `userId` del token
3. **Rutas** validan con Zod → llaman **services**
4. **Services** delegan a **funciones PG** (`SECURITY DEFINER`) para operaciones críticas
5. **PG functions** validan stock, precios, auditoría en transacción

## Funciones PG (fuente de verdad)

| Función | Uso |
|---------|-----|
| `public.registrar_venta` | Crea venta, descuenta stock, insumos, acumula puntos |
| `public.anular_venta` | Anula venta, restaura stock e insumos |
| `public.procesar_devolucion` | Devolución parcial/total, restaura stock e insumos |
| `public.cerrar_turno` | Cierra turno, calcula diferencia, genera consumo |

## Migraciones

Ubicación canónica: `database/pos/migrations/`

## Tests

- **Backend**: Jest (25 suites, 137 tests) — `npx jest`
- **Frontend**: Vitest + React Testing Library (24 files, 104 tests) — `npx vitest run`
