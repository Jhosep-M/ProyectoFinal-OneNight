# PROMPT MAESTRO — Documento Final del Proyecto
### Programación Web II — Sistema Heladería/Cafetería (POS) + Módulo de Monitoreo de Agua y Energía

> **Cómo usar este archivo:** pásaselo completo a Claude (o a otro agente) indicando:
> *"Ejecuta `docs/proyecto-final/PROMPT-CLAUDE.md` y genera el documento final completo"*.
> Claude debe producir el documento en Markdown y luego exportarlo a **Word (.docx)** y **PDF** con **normas APA 7**.
>
> **Este archivo NO es la documentación.** Es la **instrucción** para que el agente la redacte usando el repositorio real como fuente de verdad.

---

## 0. REGLAS OBLIGATORIAS PARA EL AGENTE (leer antes de todo)

1. **No inventes datos.** Si un dato no está en el repositorio o no fue provisto por el usuario, escribe `[PENDIENTE]` con una nota de qué falta y cómo obtenerlo. Prohibido inventar requisitos, columnas, tablas, endpoints, consumos, métricas o capturas.
2. **No contradigas el repositorio.** La fuente de verdad es el código y la documentación existente (ver §3). Si hay inconsistencia entre código y docs, repórtala en el documento (sección "Inconsistencias detectadas") en vez de ocultarla.
3. **La plantilla pide Laravel/PHP/Blade/MySQL, pero el proyecto real NO usa nada de eso.** Aplica la tabla de equivalencias de §2. **NO escribas código PHP ni describas Laravel como si existiera.** Nombra las tecnologías reales.
4. **El proyecto son DOS aplicaciones integradas** (POS + Monitoreo). El documento las presenta como un solo proyecto con dos aplicaciones que se comunican por API REST. Nunca describas una FK directa entre las bases de POS y Monitoreo.
5. **Idioma:** todo en **español**, tono académico, APA 7.
6. **Figuras:** usa las 4 imágenes de `docs/proyecto-final/imagenes/` (ver §4). Numéralas como `Figura N` y enlázalas en el texto.
7. **No inventes capturas.** Donde se pida evidencia (Docker, hosting, pruebas), deja el espacio `[INSERTAR CAPTURA: ...]` con la instrucción exacta de qué capturar.
8. **No ejecutes operaciones Git** (add/commit/push). Solo editar archivos locales.

---

## 1. CONTEXTO DEL PROYECTO

**Título sugerido:** *"Sistema de Gestión para Heladería/Cafetería con Módulo Integrado de Monitoreo de Consumo de Agua y Energía"*.

**Descripción:** dos aplicaciones independientes pero integradas por API:

| Aplicación | Dominio | Propósito |
|---|---|---|
| **POS Heladería/Cafetería** | Ventas, caja, pedidos, mesas, productos, inventario, insumos, recetas, proveedores, clientes, fidelización, promociones, devoluciones, pagos, reportes, auditoría, estimación de consumo | Operación diaria del local |
| **Monitoreo de Agua y Energía** | Organizaciones, puntos de medición, tipos de recurso, registros de consumo, tarifas, umbrales, clasificación, alertas, notificaciones, metas de reducción, recomendaciones, auditoría, integración con apps externas | Medir, clasificar y alertar sobre el consumo |

**Flujo de integración (resumen):**
```
POS → cierra turno → calcula consumo (agua/energía) → ConsumoReportado
    → ColaIntegracion → Worker Node.js → API Monitoreo (/api/v1/integrations/consumption)
Monitoreo → recibe (idempotente) → cola → RegistroConsumo → clasifica (umbral)
         → Alerta → cola de entrega → API POS (/api/v1/integrations/alerts)
```

**Stack real (NO Laravel):**
- Frontend: **React 18 (POS)** + **React 19 (Monitoreo)** con **Vite**.
- Backend: **Node.js + Express 5**.
- ORM: **Sequelize 6**.
- Base de datos: **PostgreSQL en Supabase**.
- Auth: **Supabase Auth + JWT**.
- Autorización: **RBAC** (Usuario → Rol → RolPermiso → Permiso).
- Seguridad de datos: **RLS** en PostgreSQL.
- Infraestructura: **Docker**, **Kubernetes**, **AWS** (previsto).
- API: REST versionada **`/api/v1/...`**.
- Validación: **zod**, **helmet**, **cors**, **express-rate-limit**, **pino**.

---

## 2. TABLA DE EQUIVALENCIAS (la plantilla dice Laravel → esto es lo real)

Cada vez que la plantilla pida un elemento Laravel, redacta el equivalente real:

| La plantilla dice | En este proyecto escribe | Evidencia en el repo |
|---|---|---|
| Laravel (framework PHP) | Node.js + Express 5 | `pos/posBackend/src/app.js`, `monitoreo/backend/src/app.js` |
| Eloquent ORM | Sequelize 6 | `pos/posBackend/src/models/`, `monitoreo/backend/src/models/` |
| `artisan` / `composer` | `npm` / scripts de `package.json` | `npm run dev`, `npm start`, `npm test` |
| Vistas Blade (`.blade.php`) | Componentes React (`.jsx`) | `pos/frontend/src/pages/`, `monitoreo/frontend/src/views/` |
| Controladores Laravel | Controllers Express | `src/controllers/` |
| Rutas `routes/web.php` | Routers Express | `src/routes/` |
| Middleware Laravel | Middlewares Express | `src/middlewares/` |
| Migraciones Laravel | SQL en `database/*/migrations` + `database/*/functions` | ver §3 |
| MySQL | PostgreSQL (Supabase) | `pg` + `@supabase/supabase-js` |
| `.env` de Laravel | `.env` de Node (dotenv) | `.env.example` |
| `docker-compose.yml` | `docker-compose.yml` (igual) | raíz |
| Capa `views` Laravel | Frontend React separado | `pos/frontend`, `monitoreo/frontend` |

> Aclara en el Capítulo VI (una nota al pie o párrafo) que la asignatura pedía Laravel pero el equipo optó por una arquitectura equivalente basada en Node.js/React/PostgreSQL, manteniendo separación por capas, ORM, migraciones, middleware, autenticación y contenedorización.

---

## 3. MAPA DE FUENTES DE VERDAD (leer esto antes de redactar cada capítulo)

Raíz del proyecto: `Proyecto-Heladeria-Monitoreo/`

**Estructura real (ojo: el backend del POS está en `pos/posBackend`, NO en `pos/backend`):**
```
Proyecto-Heladeria-Monitoreo/
├── .env.example                         # variables de entorno de todo el sistema
├── docker-compose.yml                   # 4 servicios
├── README.md                            # overview del sistema
├── pos/
│   ├── README.md                        # documentación amplia del POS
│   ├── posBackend/                      # backend POS (Express + Sequelize)
│   │   ├── Dockerfile
│   │   ├── .env.example
│   │   ├── src/{app.js,server.js,config,controllers,integrations,jobs,middlewares,models,repositories,routes,services,utils,validators}
│   │   └── tests/                       # ~34 suites (jest)
│   └── frontend/                        # frontend POS (React 18 + Vite)
│       ├── Dockerfile
│       ├── .env.example
│       └── src/{components,pages,routes,services,...}
├── monitoreo/
│   ├── backend/                         # backend Monitoreo (Express + Sequelize)
│   │   ├── Dockerfile, .env.example, docs/openapi.yaml
│   │   └── src/{controllers(models,services,repositories,routes,validators,middlewares,jobs,integrations)}
│   └── frontend/                        # frontend Monitoreo (React 19 + Vite)
│       ├── Dockerfile, nginx.conf, .env.example
│       └── src/{views,components,routes,services,...}
├── database/
│   ├── pos/
│   │   ├── migrations/                  # 13 archivos SQL (001-v2.1 … 013)
│   │   └── functions/                   # registrar_venta, anular_venta, procesar_devolucion, calcular_consumo, cerrar_turno
│   └── monitoreo/                       # 8 archivos SQL (001_v1_0_monitoreo_ddl … 006)
├── shared/
│   ├── contracts/{pos-to-monitoring, monitoring-to-pos}/   # schema.json + README
│   └── docs/{architecture,authentication,authorization,api-contract,integration}.md
├── infrastructure/
│   ├── docker/                          # Dockerfiles espejo
│   ├── kubernetes/                      # namespace, configmap, secrets.example, hpa + pos/ y monitoreo/ (deployment, service, ingress)
│   └── aws/{README.md, architecture.md(VACÍO), terraform/(VACÍO)}
└── docs/
    ├── requirements/requisitos-pos.md
    ├── uml/diagrama-entidades.md
    ├── technical-manual/manual-tecnico.md
    ├── user-manual/manual-usuario.md
    └── testing/prueba-integrada-17-pasos.md
```

**Datos duros útiles (verifícalos antes de escribir):**
- Modelos Sequelize: **31 en POS** (incl. `AlertaPos`, `ConfiguracionPos`, `EquipoConsumo`, `EquipoTurno`) y **20 en Monitoreo**.
- `docker-compose.yml`: 4 servicios — `pos-backend` (3000), `monitoreo-backend` (4000), `pos-frontend` (5173→80), `monitoreo-frontend` (5174→80), con healthchecks y límites de recursos.
- Contratos compartidos: `consumption.v1` (POS→Monitoreo) y `alerts.v1` (Monitoreo→POS).
- Funciones PostgreSQL clave: `registrar_venta`, `anular_venta`, `procesar_devolucion`, `calcular_consumo_agua`, `calcular_consumo_energia`, `cerrar_turno`, y RBAC (`usuario_tiene_permiso`).
- Requisitos: los RF/RNF reales están en `docs/requirements/requisitos-pos.md` (POS). Para Monitoreo, si no hay documento, derívalos desde `database/monitoreo` y `monitoreo/backend`, y marca lo no verificable como `[PENDIENTE]`.
- Puertos: hay una **inconsistencia** — `monitoreo/backend/README.md` dice 4001 pero `.env.example`, `docker-compose.yml` y K8s usan 4000. Repórtalo y usa **4000** (o el que confirme el usuario).

---

## 4. FIGURAS DISPONIBLES (usar estas)

Las imágenes ya están copiadas en `docs/proyecto-final/imagenes/`:

| Figura | Archivo | Contenido |
|---|---|---|
| `Figura` (Cap. III) | `imagenes/pos-casos-de-uso.png` | Diagrama de casos de uso del sistema Heladería/Cafetería (6 zonas, CU1–CU29, actores: Cajero, Mesero, Encargado de Inventario, Administrador, Supervisor, Sistema de Monitoreo) |
| `Figura` (Cap. III) | `imagenes/monitoreo-casos-de-uso.png` | Diagrama de casos de uso del Módulo de Monitoreo (CU1–CU31, actores: Responsable de Recursos, Administrador, Supervisor, Sistema POS, Sistema externo temporizado) |
| `Figura` (Cap. IV) | `imagenes/pos-entidades-relacional.png` | Diagrama entidad-relación del POS (Usuario, TurnoCaja, Cliente, MetodoPago, AuditoriaAccion, Pedido, Mesa, Venta, DetalleVenta, Producto, Categoria, Insumo, RecetaInsumo, Proveedor, Devolucion, ConsumoReportado, Promocion) |
| `Figura` (Cap. IV) | `imagenes/monitoreo-entidades-relacional.png` | Diagrama entidad-relación del Monitoreo (Organizacion, Usuario, MetaReduccion, AuditoriaCambio, PuntoMedicion, TipoRecurso, UmbralClasificacion, Recomendacion, Tarifa, RegistroConsumo, Alerta) |

**Instrucción:** cada figura debe tener **número, título descriptivo, leyenda y cita en el texto** ("Como se observa en la Figura 3, ..."), y aparecer en el **Índice de Figuras**.

> Nota: los diagramas son imágenes; transcribe en el texto los elementos principales (actores, CU, entidades, relaciones) porque las imágenes no son accesibles para lectores de pantalla. Usa los nombres que se leen en cada imagen.

---

## 5. ESTRUCTURA EXACTA DEL DOCUMENTO A GENERAR

Genera los siguientes apartados en este orden (fieles a la plantilla):

### PORTADA
Universidad, Facultad, Carrera, Asignatura (Programación Web II), Título del Proyecto, Integrantes, Docente, Gestión y Fecha.
> Marcar con `[PENDIENTE: dato]` lo que no se conozca (universidad, nombres, docente, gestión).

### HOJA DE CONTROL DOCUMENTAL
Tabla: `Versión | Fecha | Descripción del cambio | Responsable`. Inicia con v1.0.

### ÍNDICE GENERAL / ÍNDICE DE FIGURAS / ÍNDICE DE TABLAS
Genera los tres índices (en Markdown como listas/tablas; al exportar a Word, crear índices automáticos).

---

### CAPÍTULO I. INTRODUCCIÓN
- Antecedentes
- Planteamiento del problema
- Justificación (técnica, social, académica)
- Objetivo general
- Objetivos específicos
- Alcance
- Limitaciones
- Eje transversal
- ODS (Objetivos de Desarrollo Sostenible) con su justificación — el consumo de agua/energía se relaciona naturalmente con **ODS 6 (Agua limpia y saneamiento), ODS 7 (Energía asequible y no contaminante), ODS 12 (Producción y consumo responsables)**; justifica cada uno.

### CAPÍTULO II. INGENIERÍA DE REQUERIMIENTOS
- **Requerimientos funcionales**: usa los reales de `docs/requirements/requisitos-pos.md`. Estructúralos como tabla `Código (RFxx) | Descripción | Módulo`. Incluye los de integración (envío/recepción de consumo, colas, umbrales). Para Monitoreo, deriva desde su código y marca `[PENDIENTE]` si falta.
- **Requerimientos no funcionales**: seguridad, rendimiento, disponibilidad, usabilidad, mantenibilidad, portabilidad, trazabilidad (ej. RNF01–RNF18 si los encuentra en el repo; si no, redacta y marca el origen).
- **Reglas de negocio**: turno único abierto por cajero; una venta anulada permanece en historial; no devolver más de lo vendido; no eliminar productos con ventas; puntos con trazabilidad; idempotencia por `idempotencyKey`/`consumoExternoId`; umbrales sin solape; metas 0–100 %; validación de períodos de tarifa.
- **Restricciones del sistema**.

### CAPÍTULO III. MODELADO UML
- **Diagrama de casos de uso**: inserta `pos-casos-de-uso.png` y `monitoreo-casos-de-uso.png`. Enumera y describe actores y los CU (POS CU1–CU29; Monitoreo CU1–CU31) tal como se leen en cada imagen.
- **Descripción de casos de uso**: para **al menos 6–8 CU críticos** (Registrar Venta, Cerrar Turno, Anular Venta, Procesar Devolución, Registrar Consumo, Clasificar Consumo, Generar Alerta, Recibir Consumo Reportado) usa la plantilla `Actor | Precondición | Flujo principal | Flujos alternativos | Postcondición | Excepciones`.
- **Diagrama de clases**: descríbelo a partir del modelo de datos real (§ Cap. IV) y de los modelos Sequelize. Explica cada clase principal, atributos y relaciones.

### CAPÍTULO IV. BASE DE DATOS
- **Modelo relacional**: inserta `pos-entidades-relacional.png` y `monitoreo-entidades-relacional.png`. Aclara que son **dos bases separadas sin FK cruzadas**.
- **Diccionario de datos**: tablas por entidad con columnas, tipo, PK, FK, nulo, descripción. Fuente: `database/pos/migrations/*`, `database/monitoreo/*.sql` y los modelos Sequelize. **NO inventes columnas**: si no está en el SQL/modelo, no la incluyas.
- **Descripción de tablas, claves primarias y foráneas**: lista PK/FK por tabla.
- Menciona la regla de tipos: dinero y cantidades en `NUMERIC` (no `float`), PK preferentemente `UUID`.

### CAPÍTULO V. ARQUITECTURA DEL SISTEMA
- **Arquitectura lógica**: capas `routes → controllers → services → repositories → models` (fuente: `shared/docs/architecture.md` y el código).
- **Arquitectura física**: despliegue (contenedores, Kubernetes, AWS).
- **Arquitectura de software**: patrón por capas + separación POS/Monitoreo + contratos API.
- **Arquitectura de despliegue**: incluye el diagrama de los 4 contenedores + DB, y el flujo de integración.

### CAPÍTULO VI. DESARROLLO DEL SISTEMA
Traduce cada punto de la plantilla al stack real (§2):
- Tecnologías utilizadas (tabla resumen).
- Estructura del proyecto (usar el árbol real de §3).
- **Modelos**: Sequelize (31 POS + 20 Monitoreo).
- **Controladores**, **Rutas**, **Middleware**, **Autenticación/JWT/RBAC/RLS**.
- **"Vistas"**: componentes React y páginas/views.
- **Integración con la base de datos**: PostgreSQL/Supabase (equivalente a "MySQL").
- **Git y GitHub**: ramas (`main`, `develop`, features por persona), PR hacia `develop`, reglas de `AGENTS.md`.

### CAPÍTULO VII. IMPLEMENTACIÓN CON DOCKER
Incluye obligatoriamente, citando los archivos reales:
- **Dockerfiles** (4): `pos/posBackend/Dockerfile`, `pos/frontend/Dockerfile`, `monitoreo/backend/Dockerfile`, `monitoreo/frontend/Dockerfile`.
- **`docker-compose.yml`** (4 servicios, healthchecks, límites, puertos).
- **`.dockerignore`**: **NO EXISTE** en el repo → incluir el contenido propuesto y crear el archivo (ver §7 "qué falta").
- **`.env.example`** (raíz y por app).
- **Configuración de Nginx**: `monitoreo/frontend/nginx.conf` (y la config inline del POS).
- Explicación de **imágenes, contenedores, redes y volúmenes**.
- **Evidencias** (deja los espacios, no inventes el output): 
  - `[INSERTAR CAPTURA: docker compose build]`
  - `[INSERTAR CAPTURA: docker compose up -d]`
  - `[INSERTAR CAPTURA: docker compose ps]`
  - `[INSERTAR CAPTURA: docker compose logs]`
  - `[INSERTAR CAPTURA: sistema corriendo en Docker]`
  Comandos a documentar:
  ```
  docker compose build
  docker compose up -d
  docker compose ps
  docker compose logs
  ```

### CAPÍTULO VIII. INVESTIGACIÓN (FORMATO IMRyD)
> ⚠️ **La publicación en un hosting con URL pública es OBLIGATORIA.**
- **Introducción**: qué es un hosting; qué es Docker; importancia del despliegue de aplicaciones web contenerizadas.
- **Metodología**: investigar **al menos 3 plataformas** (sugeridas: **Render, Railway, Koyeb** — o AWS). Describir criterios de comparación (precio, facilidad, soporte Docker, base de datos, HTTPS, límites, free tier, escalado). Explicar el procedimiento de despliegue usado.
- **Resultados**: **tabla comparativa** de las 3 plataformas; `[INSERTAR CAPTURA: proceso de despliegue]`; **URL pública** `[PENDIENTE: URL]`; `[INSERTAR CAPTURA: sistema funcionando]`.
- **Discusión**: justificar la plataforma elegida; ventajas/desventajas frente a las otras.
- **Conclusiones**.

### CAPÍTULO IX. PRUEBAS
- **Matriz de casos de prueba**: tabla `ID | Caso | Precondición | Pasos | Resultado esperado | Resultado obtenido | Estado`.
- Cubre, como mínimo, los casos de `docs/testing/prueba-integrada-17-pasos.md` y de MEMORY: venta normal, venta multiproducto, pago dividido, stock insuficiente, anulación, devolución, apertura/cierre de turno, diferencia de caja, concurrencia, registro/clasificación de consumo, umbral, alerta, notificación, meta, tarifa, recomendación. Además: JWT inválido/expirado, sin permiso, rate limit, payload inválido, SQL injection, XSS, CORS, idempotencia duplicada, reintentos, timeout, Monitoreo caído, recuperación de cola.
- Menciona la existencia de los tests automatizados reales (POS backend ~34 suites jest, frontend vitest, Monitoreo backend `node --test`).
- **Evidencias**: `[INSERTAR CAPTURA: ejecución de pruebas]`.

### CAPÍTULO X. MANUAL DE INSTALACIÓN
Procedimiento para ejecutar localmente con Docker (paso a paso desde `docker compose`), requisitos previos (Docker, Node si aplica), variables de entorno, base de datos, URLs locales (3000/4000/5173/5174).

### CAPÍTULO XI. MANUAL DE DESPLIEGUE
Procedimiento para publicar y actualizar en la plataforma elegida (Cap. VIII), con capturas `[INSERTAR CAPTURA]` y variables/secretos requeridos.

### CAPÍTULO XII. CONCLUSIONES Y RECOMENDACIONES
Conclusiones técnicas + recomendaciones (mejoras futuras, deuda técnica).

### REFERENCIAS BIBLIOGRÁFICAS
APA 7. Incluye: documentación oficial de Node.js, Express, Sequelize, React, Vite, PostgreSQL, Supabase, Docker, Kubernetes y las plataformas de hosting usadas. **No inventes URLs de papers**; si no tienes referencia real, cita solo documentación oficial.

### ANEXOS
Repositorio GitHub, URL pública, Dockerfiles, `docker-compose.yml`, scripts, capturas y demás evidencias.

### LISTA DE VERIFICACIÓN FINAL
Reproduce y marca el estado de:
```
[ ] Documento en Word y PDF.
[ ] Repositorio GitHub actualizado.
[ ] Dockerfile y compose.yaml incluidos.
[ ] Proyecto funcional mediante Docker.
[ ] Proyecto publicado en un hosting con URL pública.
[ ] Investigación IMRyD completa.
[ ] Video de demostración.
[ ] Manual de instalación y despliegue.
[ ] Norma APA 7 aplicada.
```

---

## 6. INSTRUCCIONES DE EVIDENCIAS (capturas y comandos)

Claude **no inventa capturas**. Para cada evidencia requerida:
- Deja el marcador literal `[INSERTAR CAPTURA: <descripción exacta de qué debe verse>]`.
- Junto al marcador, incluye el **comando exacto** que produce esa evidencia (cuando aplique).
- Indica la ruta donde debe guardarse la imagen cuando el usuario la aporte, p. ej. `docs/proyecto-final/evidencias/07-docker-build.png`.

Comandos de referencia:
```bash
# Docker (Cap. VII)
docker compose build
docker compose up -d
docker compose ps
docker compose logs

# Pruebas (Cap. IX)
cd pos/posBackend && npm test
cd monitoreo/backend && npm test
cd pos/frontend && npm test
cd monitoreo/frontend && npm test
```

---

## 7. QUÉ FALTA (checklist de pendientes reales detectados en el repo)

Entrega al final del documento una sección/annex "Pendientes" con esta lista y su estado. **Verifica cada punto antes de afirmarlo.**

**Del proyecto (código/infra):**
- [ ] **`.dockerignore` no existe** (falta en los 4 servicios). Crear al menos uno por app (ignora `node_modules`, `.env`, `dist`, `.git`).
- [ ] **`infrastructure/aws/architecture.md` está vacío** (0 bytes) — redactar.
- [ ] **`infrastructure/aws/terraform/` está vacío** — si se usa AWS, crear IaC o declarar que no se usó.
- [ ] **No hay CI/CD** (`.github/workflows`). Opcional pero recomendable.
- [ ] **Inconsistencia de puerto** de `monitoreo/backend` (README dice 4001; resto usa 4000) — unificar.
- [ ] **Comentarios obsoletos en Dockerfiles** (dicen que `src/` está vacío cuando ya está implementado) — corregir.
- [ ] **Migraciones triplicadas**: canónica `database/pos/migrations` (13), `pos/posBackend/migrations` (5), `supabase/migrations` (3, congelada). Documentar cuál es la fuente de verdad (la canónica).

**Del entregable (documentación):**
- [ ] Portada, hoja de control e índices.
- [ ] Requisitos de **Monitoreo** (solo existe `requisitos-pos.md`).
- [ ] Diccionario de datos formal (PK/FK por tabla).
- [ ] Matriz de pruebas formal con resultados.
- [ ] **URL pública del hosting** (obligatoria).
- [ ] **Capturas**: Docker build/up/ps/logs, sistema en Docker, despliegue, pruebas.
- [ ] **Video de demostración**.
- [ ] **Exportación a Word y PDF** con APA 7.
- [ ] Referencias APA 7 verificadas.

**Datos que el usuario debe aportar (marcar `[PENDIENTE]`):**
- [ ] Universidad, Facultad, Carrera, Integrantes, Docente, Gestión, Fecha.
- [ ] Plataforma de hosting elegida + URL pública.
- [ ] Contenido de los PDF de referencia (si aplica): `SISTEMA GESTIÓN DE VENTAS E INVENTARIO...pdf` e `INFORME_FINAL_SISTEMA_DE_TRAZABILIDAD_PYME...pdf`.

---

## 8. FORMATO DE SALIDA ESPERADO

1. Genera el documento en Markdown en `docs/proyecto-final/DOCUMENTO-FINAL.md` (o en archivos por capítulo dentro de `docs/proyecto-final/capitulos/`).
2. La estructura de encabezados debe permitir exportar a **APA 7** (títulos jerárquicos, tablas con leyenda `Tabla N`, figuras con `Figura N`).
3. Al terminar, entrega:
   - La lista de figuras y tablas generadas.
   - La lista de marcadores `[PENDIENTE]` y `[INSERTAR CAPTURA]` pendientes de completar.
   - La sección "Pendientes" (§7) actualizada.
4. **No marques el trabajo como terminado** si quedan `[PENDIENTE]` críticos (URL pública, portada, capturas): indícalo explícitamente.

---

## 9. CRITERIOS DE ACEPTACIÓN

El documento se considera correcto si:
- Sigue **todos** los apartados de la plantilla (Portada → Anexos + Lista de verificación).
- Usa el **stack real** (Node/Express/React/PostgreSQL), sin inventar Laravel.
- Inserta las **4 figuras** correctamente numeradas y referenciadas.
- No contiene datos inventados; todo dato no verificado está marcado `[PENDIENTE]`.
- Incluye la **investigación IMRyD** con tabla comparativa de ≥3 plataformas.
- Incluye la **sección de pendientes** (§7).
- Está listo para exportar a **Word y PDF en APA 7**.

---

*Fin del prompt maestro. Ejecutar de arriba hacia abajo. Ante duda, preferir `[PENDIENTE]` antes que inventar.*
