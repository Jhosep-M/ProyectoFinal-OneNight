# supabase/migrations — CONGELADO (histórico)

La ubicación canónica de migraciones POS es (decisión de equipo 2026-09-29):

```text
Proyecto-Heladeria-Monitoreo/database/pos/migrations/
```

Ahí vive el trabajo activo (`001-v2.1-ddl.sql`, `002-*`, …, `010-fase-c-rls.sql`).
Las funciones PG viven en `Proyecto-Heladeria-Monitoreo/database/pos/functions/`
(`registrar_venta`, `anular_venta`, `procesar_devolucion`, `calcular_consumo`,
`cerrar_turno`). Los tests que fijan convenciones están en
`posBackend/tests/migrations-convention.test.js`.

Este directorio conserva únicamente los dos archivos históricos
(`001_v2_1_ddl.sql`, `002_p4_security.sql`) como referencia. **No agregar
nuevos `.sql` aquí**: el test `migrations-convention.test.js` falla si
aparece alguno fuera de la lista permitida.
