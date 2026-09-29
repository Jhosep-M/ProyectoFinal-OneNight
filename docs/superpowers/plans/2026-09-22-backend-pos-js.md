# Backend POS Heladería-Cafetería — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completar posBackend JS puro con 31 tablas V2.1, 15 endpoints /api/v1/*, JWT Bearer + RBAC, transacciones FOR UPDATE, e integración cola_integracion → Monitoreo

**Architecture:** Express + Sequelize (pg) + Supabase Auth (JWT) + RLS PostgreSQL; helmet/cors allowlist/express-rate-limit/zod/pino-http; services delegan a funciones PG SECURITY DEFINER; Worker FOR UPDATE SKIP LOCKED

**Tech Stack:** Node.js 24, Express 5, Sequelize 6, pg 8, @supabase/supabase-js 2, helmet 8, cors 2, express-rate-limit 8, zod 4, jsonwebtoken 9, pino 10, dotenv 18, npm

## Global Constraints
- NO compartir tablas POS/Monitoreo, solo API HTTPS
- Supabase Auth gestiona password/sesión/JWT; public.usuario sin passwordHash, FK usuario.id_usuario → auth.users.id
- RBAC Usuario→Rol→RolPermiso→Permiso, no if role=="admin"
- UUID PK, NUMERIC dinero, CHECK estado, UNIQUE email/nit/idempotency_key, índice parcial ux_turno_abierto WHERE estado='abierto'
- Prioridad SEGURIDAD: no USING(true), search_path=public, REVOKE FROM anon/PUBLIC
- React nunca expone service_role/secretos
- Cola cola_integracion → Node Worker → HTTPS Monitoreo, no HTTP desde Postgres
- Validar precio/stock en PG, no confiar frontend; transacciones FOR UPDATE

---
### Task 1: Modelos Sequelize 31 tablas

**Files:**
- Create: `posBackend/src/models/index.js`
- Create: `posBackend/src/models/Usuario.js`, `Rol.js`, `Permiso.js`, `RolPermiso.js`, `Categoria.js`, `Producto.js`, `Insumo.js`, `RecetaInsumo.js`, `Proveedor.js`, `MovimientoInventario.js`, `Cliente.js`, `MovimientoPuntos.js`, `Mesa.js`, `Pedido.js`, `DetallePedido.js`, `Venta.js`, `DetalleVenta.js`, `MetodoPago.js`, `Pago.js`, `TurnoCaja.js`, `Devolucion.js`, `Promocion.js`, `PromocionProducto.js`, `ConsumoReportado.js`, `ColaIntegracion.js`, `EntregaAlerta.js`, `AlertaPos.js`, `AuditoriaAccion.js`, `ConfiguracionPos.js`, `EquipoConsumo.js`, `EquipoTurno.js`

**Interfaces:**
- Consumes: `posBackend/src/config/database.js:sequelize`
- Produces: `Sequelize.Model` por tabla con `tableName`, `timestamps`, `underscored` mapping a nombres reales (id_usuario, etc.), exportados en `models/index.js` como `db.{Usuario,...}` y `db.sequelize`

- [ ] **Step 1: Definir modelos base con mapeo V2.1**
```javascript
// posBackend/src/models/Producto.js
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => sequelize.define('Producto', {
  id_producto: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4, field: 'id_producto' },
  categoria_id: { type: DataTypes.UUID, field: 'categoria_id' },
  nombre: { type: DataTypes.STRING, allowNull: false },
  precio: { type: DataTypes.DECIMAL(14,2), allowNull: false },
  stock: { type: DataTypes.DECIMAL(14,2), defaultValue: 0 },
  stock_minimo: { type: DataTypes.DECIMAL(14,2), defaultValue: 0, field: 'stock_minimo' },
  estado: { type: DataTypes.STRING, defaultValue: 'activo' },
}, { tableName: 'producto', timestamps: true, createdAt: 'creado_en', updatedAt: 'actualizado_en' });
```

- [ ] **Step 2: Crear src/models/index.js que registra todos y define asociaciones**
```javascript
const { sequelize } = require('../config/database');
const Usuario = require('./Usuario')(sequelize);
// ... 30 más
const db = { sequelize, Usuario, Rol /*...*/ };
Object.keys(db).forEach(m => db[m].associate && db[m].associate(db));
module.exports = db;
```

- [ ] **Step 3: Verificar carga sin DB**
Run: `node -e "require('./src/models'); console.log('models ok')"` in posBackend
Expected: `models ok`

- [ ] **Step 4: Commit**
```bash
git add posBackend/src/models
git commit -m "feat(models): add 31 Sequelize models V2.1"
```

### Task 2: Repositorios transaccionales

**Files:**
- Create: `posBackend/src/repositories/ventaRepository.js`, `posBackend/src/repositories/turnoRepository.js`, `posBackend/src/repositories/productoRepository.js`

**Interfaces:**
- Consumes: `models` + `sequelize.query`
- Produces: `ventaRepository.findByIdForUpdate(id, t)`, `turnoRepository.findOpenByUser(uid, t)`

- [ ] **Step 1: Write failing test (manual)**
```javascript
// test: should lock producto row
const [rows] = await sequelize.query("SELECT stock FROM producto WHERE id_producto=:id FOR UPDATE", { replacements: { id } });
assert(rows[0]);
```

- [ ] **Step 2: Run test to verify fails (no impl)**
Run: `node -e "..."`
Expected: `productoRepository not defined`

- [ ] **Step 3: Implement repositories con FOR UPDATE**
```javascript
async function findProductoForUpdate(id, transaction) {
  const [rows] = await sequelize.query(`SELECT * FROM producto WHERE id_producto=:id FOR UPDATE`, { replacements: { id }, transaction });
  return rows[0];
}
```

- [ ] **Step 4: Run test passes**
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add posBackend/src/repositories
git commit -m "feat(repo): add FOR UPDATE repositories"
```

### Task 3: Services (delegan a funciones PG)

**Files:**
- Create: `posBackend/src/services/ventaService.js`, `turnoService.js`, `devolucionService.js`

**Interfaces:**
- Consumes: `repositories/*`, `sequelize.query('SELECT public.registrar_venta...')`
- Produces: `ventaService.crear({turno_id, items, pagos, userId}) => venta_id`

- [ ] **Step 1: Test registrar_venta wrapper**
```javascript
const id = await ventaService.crear({ turno_id, items:[{producto_id,cantidad:1}], pagos:[{metodo_pago_id,monto:25}], userId });
assert(id);
```

- [ ] **Step 2: Run (espera FAIL sin service)**
- [ ] **Step 3: Implement ventaService.crear que llama SELECT public.registrar_venta(:uid,...)**
- [ ] **Step 4: Verify**
- [ ] **Step 5: Commit**

### Task 4: Validators Zod + sanitización

**Files:**
- Modify: `posBackend/src/validators/sales.js`
- Create: `posBackend/src/validators/product.js`, `inventory.js`, `shifts.js`, `orders.js`

**Interfaces:**
- Consumes: `zod`
- Produces: `productSchema.parse(req.body)` throw 400

- [ ] **Step 1: Test validation rejects precio from frontend**
```javascript
productSchema.parse({ nombre:'x', precio: -5 }) // should throw
```

- [ ] **Step 2: Implement schemas con trim, max, positive**
- [ ] **Step 3: Commit**

### Task 5: Routes restantes (12 endpoints)

**Files:**
- Create: `posBackend/src/routes/users.js`, `inventory.js`, `customers.js`, `orders.js`, `payments.js`, `returns.js`, `promotions.js`, `audit.js`, `integrations.js`, `config.js`
- Create: `posBackend/src/controllers/*.js`
- Modify: `posBackend/src/app.js`

**Interfaces:**
- Consumes: `authenticateJWT`, `authorize(permiso)`, `services/*`
- Produces: Express routers montados en `/api/v1/*`

- [ ] **Step 1: Test GET /api/v1/products sin Bearer →401, sin permiso →403**
- [ ] **Step 2: Implement usersRouter con authorize('usuario.gestionar')**
- [ ] **Step 3: Register in app.js**
```javascript
app.use('/api/v1/users', usersRouter);
```
- [ ] **Step 4: Verify with curl (Bearer)**
- [ ] **Step 5: Commit**

### Task 6: Worker cola_integracion + monitoreoClient hardening

**Files:**
- Modify: `posBackend/src/jobs/colaWorker.js`, `src/integrations/monitoreoClient.js`

**Interfaces:**
- Consumes: `sequelize`, `fetch`
- Produces: `processColaOnce() => count`, `startWorker(ms)`

- [ ] **Step 1: Test processColaOnce con 1 fila pendiente mock fetch**
- [ ] **Step 2: Implement FOR UPDATE SKIP LOCKED + timeout 5s + retry backoff + gen_random_uuid()**
- [ ] **Step 3: Commit**

### Task 7: Hardening seguridad §65

**Files:**
- Modify: `posBackend/src/app.js`, `src/middlewares/*`, `src/config/cors.js`

**Interfaces:**
- Consumes: `helmet`, `cors`, `express-rate-limit`
- Produces: Headers CSP/HSTS, CORS allowlist, rateLimit

- [ ] **Step 1: Test helmet headers present, cors blocks origen no allowlist**
```bash
curl -H "Origin: https://evil.com" http://localhost:3000/health -v # should 403 CORS
```

- [ ] **Step 2: Implement helmet({contentSecurityPolicy, hsts}) + cors({origin: env.corsOrigin})**
- [ ] **Step 3: Commit**

