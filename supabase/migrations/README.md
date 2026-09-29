# supabase/migrations — CONGELADO (histórico)

La ubicación canónica de migraciones es:

```text
Proyecto-Heladeria-Monitoreo/pos/posBackend/migrations/
```

Ahí vive el trabajo activo (`003-*`, `004-*`, …) junto a los tests que fijan
su contenido (`posBackend/tests/security.*.test.js`).

Este directorio conserva únicamente los dos archivos históricos
(`001_v2_1_ddl.sql`, `002_p4_security.sql`) como referencia. **No agregar
nuevos `.sql` aquí**: el test `migrations-convention.test.js` falla si
aparece alguno fuera de la lista permitida.
