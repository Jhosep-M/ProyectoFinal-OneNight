# MEMORY.md

# Memoria del proyecto — Heladería/Cafetería + Monitoreo

## 1. Contexto

Proyecto académico de Programación Web 2 / Desarrollo de Sistemas.

El sistema completo está compuesto por dos aplicaciones:

- POS de Heladería/Cafetería.
- Sistema de Monitoreo de consumo de agua y energía.

Los sistemas deben funcionar de manera independiente, pero comunicarse mediante APIs.

La prioridad técnica del proyecto es construir una solución segura, modular, mantenible y desplegable mediante Docker, Kubernetes y AWS.

---

# 2. Arquitectura acordada

```text
                    PROYECTO
                       │
             ┌─────────┴─────────┐
             │                   │
            POS             MONITOREO
             │                   │
       React + Node          React + Node
             │                   │
       PostgreSQL/Supabase   PostgreSQL/Supabase
             │                   │
             └────── API REST ───┘
```

Cada sistema debe ser propietario de sus propios datos.

No existe una FK directa entre las bases de POS y Monitoreo.

La comunicación se realiza mediante API REST, autenticación, contratos, colas, reintentos e idempotencia.

---

# 3. Stack

## Frontend

- React
- Vite

## Backend

- Node.js
- Express
- Sequelize

## Base de datos

- PostgreSQL
- Supabase

## Autenticación

- Supabase Auth
- JWT

## Autorización

- RBAC
- Permisos

## Seguridad de datos

- RLS

## Infraestructura

- Docker
- Kubernetes
- AWS

---

# 4. Estructura de repositorio

```text
Proyecto-Heladeria-Monitoreo/
├── pos/
│   ├── frontend/
│   └── backend/
├── monitoreo/
│   ├── frontend/
│   └── backend/
├── database/
│   ├── pos/
│   └── monitoreo/
├── shared/
│   ├── contracts/
│   └── docs/
├── infrastructure/
│   ├── docker/
│   ├── kubernetes/
│   └── aws/
├── docs/
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

---

# 5. Modelo conceptual POS aprobado

## Seguridad/RBAC

- Usuario
- Rol
- Permiso
- RolPermiso

`Usuario` contiene identidad/perfil, pero no debe almacenar `passwordHash` cuando las contraseñas son administradas por Supabase Auth.

## Caja

- TurnoCaja

Regla importante:

- Un cajero no puede tener dos turnos abiertos simultáneamente.

## Ventas

- Venta
- DetalleVenta
- Pago
- MetodoPago

Una venta puede tener pagos divididos.

Una venta anulada debe permanecer en historial.

## Pedidos

- Mesa
- Pedido
- DetallePedido

Un pedido puede convertirse en venta.

## Catálogo

- Producto
- Categoria

## Inventario

- Insumo
- RecetaInsumo
- Proveedor
- MovimientoInventario

Una venta debe poder descontar producto y, cuando corresponda, ingredientes de la receta.

## Clientes

- Cliente
- MovimientoPuntos

## Promociones

- Promocion
- PromocionProducto

## Devoluciones

- Devolucion

Las devoluciones deben validar que no se devuelva más cantidad de la vendida.

## Integración

- ConsumoReportado
- ColaIntegracion
- EntregaAlerta

## Auditoría

- AuditoriaAccion

---

# 6. Modelo conceptual Monitoreo aprobado

## Seguridad/RBAC

- Usuario
- Rol
- Permiso
- RolPermiso

## Organización

- Organizacion
- UsuarioOrganizacion

## Integración

- Integracion
- RecepcionConsumoPOS
- ColaProcesamiento
- EntregaAlerta

Las API keys no deben almacenarse en texto plano.

Usar `apiKeyHash`.

## Medición

- PuntoMedicion
- TipoRecurso

## Consumo

- RegistroConsumo

## Clasificación

- UmbralClasificacion

## Alertas

- Alerta
- Notificacion

## Objetivos

- MetaReduccion

## Costos

- Tarifa

## Recomendaciones

- Recomendacion

## Auditoría

- AuditoriaCambio

---

# 7. Contrato POS → Monitoreo

Endpoint:

```text
POST /api/v1/integrations/consumption
```

Payload conceptual:

```json
{
  "consumoExternoId": "uuid",
  "tipoRecurso": "agua",
  "cantidad": 125.5,
  "unidadMedida": "litros",
  "fechaConsumo": "2026-09-21T18:00:00",
  "organizacionExternaId": "uuid",
  "origen": "POS"
}
```

Debe ser:

- autenticado;
- validado;
- idempotente;
- trazable;
- tolerante a reintentos.

La misma operación no debe registrarse dos veces si se reenvía.

---

# 8. Contrato Monitoreo → POS

Endpoint:

```text
POST /api/v1/integrations/alerts
```

Payload conceptual:

```json
{
  "alertaId": "uuid",
  "nivel": "critico",
  "tipoRecurso": "energia",
  "mensaje": "Consumo superior al umbral",
  "fechaGeneracion": "2026-09-21T18:00:00"
}
```

El POS debe evitar duplicar la alerta cuando se reenvía el mismo `alertaId`.

---

# 9. Flujo de integración

```text
POS
 ↓
Venta/Cierre
 ↓
ConsumoReportado
 ↓
ColaIntegracion
 ↓
Worker
 ↓
API Monitoreo
 ↓
RecepcionConsumoPOS
 ↓
ColaProcesamiento
 ↓
RegistroConsumo
 ↓
Clasificación
 ↓
Alerta
 ↓
EntregaAlerta
 ↓
Worker
 ↓
API POS
 ↓
Entrega/recepción de alerta
```

El POS debe poder continuar registrando ventas aunque el Monitoreo esté temporalmente indisponible.

---

# 10. Seguridad acordada

## Nunca

No guardar:

- passwords en tablas públicas si Supabase Auth administra las credenciales;
- service-role key en React;
- secretos en GitHub;
- API keys en texto plano;
- credenciales AWS en el repositorio.

## Backend

Aplicar:

- JWT;
- RBAC;
- validación;
- rate limiting;
- Helmet/security headers;
- CORS;
- request ID;
- logs;
- manejo centralizado de errores;
- timeout;
- consultas parametrizadas/Sequelize.

## Base de datos

- RLS.
- UUID.
- UNIQUE.
- CHECK constraints.
- índices.
- transacciones.
- control de concurrencia.

---

# 11. Reglas de datos

- Dinero: `NUMERIC`.
- Cantidades: `NUMERIC`.
- Evitar `float` para dinero/mediciones importantes.
- UUID como PK preferentemente.
- Email único.
- Código de medidor único.
- Idempotency keys únicas.
- No eliminar físicamente ventas históricas.
- Registrar auditoría de operaciones críticas.
- Indexar FKs, fechas, estados y campos de integración.
- Validar períodos de tarifas.
- Validar rangos de umbrales.
- Validar metas entre 0 y 100%.
- Evitar solapamientos de rangos cuando corresponda.

---

# 12. Funciones críticas ya definidas

Se ha trabajado/propuesto:

- `descontar_stock_producto`
- `descontar_insumos_receta`
- `registrar_venta()`
- `anular_venta()`
- `procesar_devolucion()`
- `cerrar_turno()` como siguiente pieza crítica a completar.

## Registrar venta

Debe controlar:

- usuario;
- turno;
- productos;
- stock;
- pagos;
- totales;
- inventario;
- auditoría;
- concurrencia.

## Anular venta

Debe:

- verificar venta activa;
- verificar autorización;
- restaurar stock;
- registrar movimiento;
- cambiar estado;
- registrar motivo;
- auditar.

## Devolución

Debe:

- validar venta;
- validar cantidad;
- impedir devolver más de lo vendido;
- restaurar inventario;
- registrar movimiento;
- auditar.

Nota: una versión previa de `procesar_devolucion()` restauraba producto, pero debe verificarse que también restaure correctamente los insumos de receta cuando corresponda.

---

# 13. Posible inconsistencia a revisar

Antes de continuar con funciones SQL existentes, verificar que `movimiento_inventario` tenga exactamente las columnas usadas por las funciones.

Se había asumido algo equivalente a:

```text
producto_id
usuario_id
venta_id
devolucion_id
tipo
cantidad
motivo
```

También verificar exactamente las columnas de `turno_caja`:

```text
id_turno
usuario_id
monto_inicial
monto_final_esperado
monto_final_real
diferencia
fecha_apertura
fecha_cierre
estado
```

No asumir que el esquema actual coincide: primero inspeccionarlo.

---

# 14. División del equipo

## Persona 1

POS:

- ventas;
- caja;
- pagos;
- pedidos;
- mesas;
- devoluciones/anulaciones relacionadas.

## Persona 2

POS:

- productos;
- categorías;
- inventario;
- insumos;
- recetas;
- proveedores;
- clientes;
- puntos;
- promociones.

## Persona 3

Monitoreo:

- organizaciones;
- medición;
- consumo;
- umbrales;
- alertas;
- notificaciones;
- metas;
- tarifas;
- recomendaciones;
- reportes.

## Persona 4

Transversal:

- Supabase Auth;
- JWT;
- RBAC;
- RLS coordination;
- integración POS ↔ Monitoreo;
- colas;
- workers;
- idempotencia;
- seguridad;
- Docker;
- Kubernetes;
- AWS.

Persona 4 coordina infraestructura, pero los responsables de cada aplicación también deben mantener sus Dockerfiles y health checks.

---

# 15. Git

Ramas:

```text
main
develop
```

Features:

```text
feature/persona1-pos-ventas
feature/persona2-pos-inventario
feature/persona3-monitoreo
feature/persona4-security-integration
```

Reglas:

- No trabajar directamente en `main`.
- Pull Request hacia `develop`.
- Revisar antes de merge.
- No subir `.env`.
- No cambiar contratos compartidos unilateralmente.
- No modificar módulos de otro miembro sin coordinación.

---

# 16. Pruebas importantes

## POS

- Venta normal.
- Venta con múltiples productos.
- Pago dividido.
- Stock insuficiente.
- Anulación.
- Devolución.
- Apertura de turno.
- Cierre de turno.
- Diferencia de caja.
- Concurrencia.

## Inventario

- Entrada.
- Salida.
- Ajuste.
- Stock mínimo.
- Receta.
- Descuento de ingredientes.
- Devolución.
- Venta concurrente del último producto.

## Monitoreo

- Registro de consumo.
- Clasificación.
- Umbral.
- Alerta.
- Notificación.
- Meta.
- Tarifa.
- Recomendación.
- Reporte.

## Integración/seguridad

- JWT inválido.
- JWT expirado.
- Usuario sin permiso.
- Rate limiting.
- Payload inválido.
- SQL injection.
- XSS.
- CORS.
- Duplicación por idempotencia.
- Reintentos.
- Timeout.
- Monitoreo caído.
- Recuperación de cola.

---

# 17. Prueba integrada principal

```text
Abrir turno
  ↓
Registrar venta
  ↓
Cerrar turno
  ↓
Generar consumo
  ↓
Enviar a Monitoreo
  ↓
Recibir consumo
  ↓
Clasificar
  ↓
Generar alerta
  ↓
Enviar alerta al POS
  ↓
Recibir alerta
  ↓
Auditar
```

Esta prueba debe demostrar que los dos sistemas realmente funcionan como un solo proyecto sin compartir directamente sus tablas.

---

# 18. Orden de desarrollo

```text
1. Estructura del repositorio
2. Git
3. Modelos y migraciones
4. Supabase Auth
5. JWT
6. RBAC
7. RLS
8. POS
9. Monitoreo
10. Contratos API
11. Colas
12. Workers
13. Idempotencia
14. Pruebas integradas
15. Docker
16. Kubernetes
17. AWS
18. Documentación
```

---

# 19. Documentación

Mantener:

```text
docs/
├── uml/
├── requirements/
├── technical-manual/
├── user-manual/
└── testing/
```

La documentación debe reflejar el código real.

Cuando cambie una decisión importante:

```text
Código
↓
Modelo/UML
↓
API contract
↓
Pruebas
↓
Manual/documentación
```

---

# 20. Principios de mantenimiento

1. No duplicar entidades.
2. No mezclar POS y Monitoreo.
3. No saltarse capas sin razón.
4. No colocar secretos en código.
5. No confiar en el frontend para seguridad.
6. No eliminar historial crítico.
7. No ignorar concurrencia.
8. No procesar dos veces eventos de integración.
9. No cambiar contratos sin coordinación.
10. No inventar columnas/tablas: inspeccionar primero.
11. Mantener pruebas junto al código.
12. Mantener documentación actualizada.
13. Priorizar seguridad y trazabilidad.
14. Preferir cambios pequeños y revisables.
15. Antes de refactorizar, comprobar qué módulos dependen del código.

---

# 21. Estado conceptual del proyecto

El proyecto ya tiene definido conceptualmente:

- separación POS/Monitoreo;
- arquitectura por capas;
- modelos principales;
- relaciones principales;
- integración POS → Monitoreo;
- integración Monitoreo → POS;
- autenticación;
- RBAC;
- RLS;
- colas;
- idempotencia;
- estrategia de seguridad;
- división de trabajo;
- estrategia Git;
- estrategia Docker/Kubernetes/AWS;
- pruebas principales.

Lo que debe comprobarse antes de asumirlo como implementado es el estado real del repositorio, código, migraciones y base de datos.

**Esta memoria describe la arquitectura y decisiones acordadas; no implica que todo esté ya implementado.**
