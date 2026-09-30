# Spec: Rediseño Visual POS — Helados Pariente

**Fecha:** 2026-09-28
**Estado:** Aprobado
**Prototipo:** Stitch proyecto `POS Heladería - Diseño Visual` (ID: 10580476829389076176)

---

## 1. Objetivo

Rediseñar completamente el frontend del POS con:
- Bootstrap 5 como framework CSS base
- Bootstrap Icons para iconografía
- Framer Motion para animaciones sutiles de UI
- Tema personalizado "Heladería Premium" (no genérico)
- Paleta cálida artesanal con acento terracota

---

## 2. Stack Tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Framework | React | 18.3.1 |
| Build | Vite | 5.4.11 |
| CSS Framework | Bootstrap | 5.3.x |
| Iconos | Bootstrap Icons | 1.11.x |
| Animaciones | Framer Motion | 11.x |
| Lenguaje | JavaScript (JSX) | — |
| Routing | React Router DOM | 6.28.0 |
| Auth | Supabase JS | 2.116.0 |

---

## 3. Sistema de Diseño

### 3.1 Colores (Custom Properties Bootstrap)

```css
:root {
  /* Superficies */
  --bs-body-bg: #FAF9F7;
  --bs-body-color: #1C1917;
  --bs-tertiary-bg: #F5F0EB;
  --bs-border-color: #E7E5E4;

  /* Acento principal — Terracota */
  --bs-primary: #C2410C;
  --bs-primary-rgb: 194, 65, 12;
  --bs-primary-dark: #9A3412;
  --bs-primary-light: #FEF3C7;

  /* Secundario — Carbón */
  --bs-secondary: #78716C;
  --bs-secondary-rgb: 120, 113, 108;

  /* Semántico */
  --bs-success: #059669;
  --bs-danger: #B91C1C;
  --bs-warning: #D97706;
  --bs-info: #1D4ED8;

  /* Sidebar */
  --sidebar-bg: #1C1917;
  --sidebar-color: #FAF9F7;
  --sidebar-active: #C2410C;

  /* Cards */
  --card-bg: #FFFFFF;
  --card-border: #E7E5E4;
  --card-shadow: 0 1px 3px rgba(28, 25, 23, 0.04);
  --card-shadow-hover: 0 4px 12px -2px rgba(28, 25, 23, 0.08);
}
```

### 3.2 Tipografía

```css
:root {
  --bs-font-sans-serif: 'Inter', system-ui, -apple-system, sans-serif;
  --bs-font-serif: 'Newsreader', Georgia, serif;
}

/* Escala tipográfica */
--font-size-xs: 0.75rem;    /* 12px */
--font-size-sm: 0.875rem;   /* 14px */
--font-size-base: 1rem;     /* 16px */
--font-size-lg: 1.125rem;   /* 18px */
--font-size-xl: 1.25rem;    /* 20px */
--font-size-2xl: 1.5rem;    /* 24px */
--font-size-3xl: 2rem;      /* 32px */
--font-size-4xl: 2.5rem;    /* 40px */
```

**Google Fonts a cargar:**
- `Newsreader:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600` (headings, logo)
- `Inter:wght@400;500;600;700` (body, UI)

### 3.3 Shape y Elevación

```css
:root {
  --bs-border-radius: 0.5rem;      /* 8px — botones, inputs */
  --bs-border-radius-sm: 0.375rem;  /* 6px — badges */
  --bs-border-radius-lg: 0.75rem;   /* 12px — cards */
  --bs-border-radius-xl: 1rem;      /* 16px — modales */
  --bs-border-radius-pill: 50rem;   /* pills */
}

/* Sombras */
--shadow-card: 0 1px 3px rgba(28, 25, 23, 0.04), 0 1px 2px rgba(28, 25, 23, 0.02);
--shadow-hover: 0 4px 12px -2px rgba(28, 25, 23, 0.08), 0 2px 6px -1px rgba(28, 25, 23, 0.04);
--shadow-modal: 0 20px 25px -5px rgba(28, 25, 23, 0.12), 0 8px 10px -6px rgba(28, 25, 23, 0.06);
```

### 3.4 Espaciado

Mantener sistema 4px de Bootstrap:
- `0.25rem` (4px), `0.5rem` (8px), `0.75rem` (12px), `1rem` (16px), `1.25rem` (20px), `1.5rem` (24px), `2rem` (32px)

---

## 4. Estructura de Archivos

```
pos/frontend/src/
├── main.jsx
├── App.jsx
├── styles/
│   ├── tokens.css          # Custom properties (colores, tipografía, espaciado)
│   ├── bootstrap-theme.css # Override de variables Bootstrap
│   ├── components.css      # Clases de componentes personalizados
│   └── app.css             # Layout y estilos globales
├── layouts/
│   ├── MainLayout.jsx      # Sidebar + Header + Outlet
│   ├── Sidebar.jsx         # Navegación lateral
│   ├── Header.jsx          # Barra superior
│   └── AuthLayout.jsx      # Layout para login
├── pages/
│   ├── auth/LoginPage.jsx
│   ├── dashboard/DashboardPage.jsx
│   ├── ventas/VentasPage.jsx
│   ├── caja/CajaPage.jsx
│   ├── pedidos/PedidosPage.jsx
│   ├── mesas/MesasPage.jsx
│   ├── catalogo/
│   │   ├── ProductosPage.jsx
│   │   ├── InventarioPage.jsx
│   │   └── RecetasPage.jsx
│   ├── clientes/ClientesPage.jsx
│   ├── promociones/PromocionesPage.jsx
│   ├── usuarios/UsuariosPage.jsx
│   ├── auditoria/AuditoriaPage.jsx
│   └── integracion/IntegracionPage.jsx
├── components/
│   ├── ui/                 # Componentes base reutilizables
│   │   ├── Button.jsx
│   │   ├── Card.jsx
│   │   ├── Badge.jsx
│   │   ├── Input.jsx
│   │   ├── Select.jsx
│   │   ├── Modal.jsx
│   │   ├── DataTable.jsx
│   │   ├── Alert.jsx
│   │   ├── Skeleton.jsx
│   │   ├── EmptyState.jsx
│   │   └── Avatar.jsx
│   ├── layout/
│   │   ├── Sidebar.jsx
│   │   └── Header.jsx
│   └── ventas/
│       ├── ProductGrid.jsx
│       ├── ProductCard.jsx
│       ├── TicketPanel.jsx
│       └── PaymentButtons.jsx
├── hooks/
│   ├── useAuth.js
│   └── usePermisos.js
├── context/
│   ├── AuthContext.jsx
│   └── PermisosContext.jsx
├── services/
│   ├── api.js
│   ├── authService.js
│   ├── ventasService.js
│   ├── cajaService.js
│   ├── mesasService.js
│   ├── productosService.js
│   └── ...
└── utils/
    ├── format.js           # Formato de moneda, fechas
    └── constants.js        # Constantes de la app
```

---

## 5. Componentes Base

### 5.1 Button

```jsx
// Variantes: primary, secondary, ghost, danger, outline
// Tamaños: sm (32px), md (40px), lg (48px)
// Con icono Bootstrap opcional a la izquierda

<Button variant="primary" size="lg" icon="bi-cash-stack">
  Cobrar $45.50
</Button>
```

**Estilos:**
- Primary: `bg: #C2410C`, `color: #FFF`, hover: `#9A3412`, active: `#7C2D12`
- Secondary: `bg: #FFF`, `border: 1px solid #E7E5E4`, `color: #1C1917`, hover: `bg: #F5F5F4`
- Ghost: `bg: transparent`, `color: #1C1917`, hover: `bg: rgba(28,25,23,0.05)`
- Danger: `bg: #B91C1C`, `color: #FFF`, hover: `#991B1B`

### 5.2 Card

```jsx
<Card className="h-100">
  <Card.Body>
    <Card.Title>Ventas del día</Card.Title>
    <Card.Text>$1,250.00</Card.Text>
  </Card.Body>
</Card>
```

**Estilos:**
- `bg: #FFFFFF`, `border: 1px solid #E7E5E4`, `radius: 10px`
- Sombra: `0 1px 3px rgba(28,25,23,0.04)`
- Hover: `0 4px 12px -2px rgba(28,25,23,0.08)`

### 5.3 Badge

```jsx
<Badge variant="success">Completado</Badge>
<Badge variant="warning">Preparando</Badge>
<Badge variant="danger">Anulado</Badge>
<Badge variant="info">En espera</Badge>
```

**Estilos:**
- Altura: 24px, `radius: 999px`, `font-size: 11px`, `font-weight: 600`, `letter-spacing: 0.04em`
- Success: `bg: #ECFDF5`, `color: #059669`, `border: 1px solid #A7F3D0`
- Warning: `bg: #FEF3C7`, `color: #B45309`, `border: 1px solid #FDE68A`
- Danger: `bg: #FEE2E2`, `color: #B91C1C`, `border: 1px solid #FECACA`
- Info: `bg: #DBEAFE`, `color: #1D4ED8`, `border: 1px solid #BFDBFE`

### 5.4 Input

```jsx
<Input
  type="text"
  placeholder="Buscar sabor o producto..."
  icon="bi-search"
/>
```

**Estilos:**
- `bg: #FFF`, `border: 1px solid #E7E5E4`, `radius: 8px`, `height: 44px`
- Focus: `border-color: #C2410C`, `box-shadow: 0 0 0 2px rgba(194,65,12,0.15)`

### 5.5 Modal

```jsx
<Modal show={show} onClose={onClose} title="Confirmar acción">
  <p>¿Estás seguro de anular esta venta?</p>
  <Modal.Footer>
    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
    <Button variant="danger" onClick={onConfirm}>Anular</Button>
  </Modal.Footer>
</Modal>
```

**Estilos:**
- Backdrop: `rgba(28, 25, 23, 0.4)` con `backdrop-filter: blur(2px)`
- Modal: `bg: #FFF`, `radius: 16px`, `shadow: 0 20px 25px -5px rgba(28,25,23,0.12)`
- Header: `border-bottom: 1px solid #E7E5E4`, título en Newsreader 20px

### 5.6 DataTable

```jsx
<DataTable
  columns={columns}
  data={data}
  pagination
  pageSize={10}
/>
```

**Estilos:**
- Header: `bg: #F5F0EB`, `font-size: 12px`, `font-weight: 600`, `text-transform: uppercase`, `letter-spacing: 0.02em`
- Filas: `border-bottom: 1px solid #E7E5E4`, hover: `bg: #FAF9F7`
- Celdas: `padding: 12px 16px`, `font-size: 14px`

---

## 6. Layout Principal

### 6.1 Sidebar

```jsx
<Sidebar>
  <Sidebar.Brand>Helados Pariente</Sidebar.Brand>
  <Sidebar.Group title="Operación">
    <Sidebar.Item icon="bi-grid" to="/dashboard">Dashboard</Sidebar.Item>
    <Sidebar.Item icon="bi-cart" to="/ventas">Ventas</Sidebar.Item>
    <Sidebar.Item icon="bi-cash-register" to="/caja">Caja</Sidebar.Item>
    <Sidebar.Item icon="bi-clipboard" to="/pedidos">Pedidos</Sidebar.Item>
    <Sidebar.Item icon="bi-grid-3x3" to="/mesas">Mesas</Sidebar.Item>
  </Sidebar.Group>
  <Sidebar.Group title="Catálogo">
    <Sidebar.Item icon="bi-box" to="/catalogo/productos">Productos</Sidebar.Item>
    <Sidebar.Item icon="bi-boxes" to="/catalogo/inventario">Inventario</Sidebar.Item>
    <Sidebar.Item icon="bi-journal-text" to="/catalogo/recetas">Recetas</Sidebar.Item>
  </Sidebar.Group>
  <Sidebar.Group title="Sistema">
    <Sidebar.Item icon="bi-people" to="/usuarios">Usuarios</Sidebar.Item>
    <Sidebar.Item icon="bi-shield" to="/auditoria">Auditoría</Sidebar.Item>
    <Sidebar.Item icon="bi-gear" to="/integracion">Integración</Sidebar.Item>
  </Sidebar.Group>
</Sidebar>
```

**Estilos:**
- Ancho: 220px (desktop), 80px (tablet, solo iconos)
- Fondo: `#1C1917`
- Color texto: `#FAF9F7`
- Item activo: `bg: #C2410C`, `color: #FFF`, barra izquierda 3px
- Item hover: `bg: #292524`
- Logo: Newsreader italic 20px, color `#FAF9F7`
- Separadores: `border-top: 1px solid rgba(255,255,255,0.08)`

### 6.2 Header

```jsx
<Header>
  <Header.Title>Panel Principal</Header.Title>
  <Header.Breadcrumb>Hoy, 28 sept 2026</Header.Breadcrumb>
  <Header.Actions>
    <Header.Notification icon="bi-bell" count={2} />
    <Header.Avatar name="María González" />
  </Header.Actions>
</Header>
```

**Estilos:**
- Altura: 64px
- Fondo: `#FFF`, `border-bottom: 1px solid #E7E5E4`
- Título: Newsreader 28px semibold
- Breadcrumb: Inter 12px, color `#78716C`

---

## 7. Pantallas Principales

### 7.1 Dashboard (`/dashboard`)

**Layout:** 4 columnas de métricas + grid 2 columnas (gráfico + pedidos) + panel alertas

**Componentes:**
- `MetricCard` (x4): icono en círculo terracota suave, valor Inter 700 28px, label uppercase 12px, tendencia con flecha
- `SalesChart`: gráfico de barras SVG simple (sin librería), barras terracota, eje X horas 9-21
- `RecentOrders`: lista de 5 pedidos con badge de estado
- `AlertsPanel`: alertas de stock bajo y mesas sin atención

### 7.2 Ventas (`/ventas`)

**Layout:** 2 columnas — 62% catálogo + 38% ticket

**Componentes:**
- `SearchBar`: input con icono búsqueda, placeholder "Buscar sabor o producto..."
- `CategoryTabs`: tabs con borde inferior 2px terracota en activa
- `ProductGrid`: grid 4 columnas de `ProductCard`
- `ProductCard`: imagen placeholder con color según sabor, nombre Newsreader 16px, precio Inter 700 18px terracota, badge stock bajo
- `TicketPanel`: lista de items con +/- cantidades, subtotal, IVA 16%, total, botones de pago, botón "Cobrar" terracota 48px

### 7.3 Caja (`/caja`)

**Layout:** 2 columnas — 35% resumen turno + 65% transacciones

**Componentes:**
- `TurnSummary`: info del turno, métricas (ventas, transacciones, ticket promedio, efectivo en caja, diferencia), botones "Cerrar Turno" y "Arqueo Parcial"
- `TransactionTable`: tabla con filtros por método de pago, paginación, badges de estado

### 7.4 Mesas (`/mesas`)

**Layout:** 2 columnas — 70% grid mesas + 30% detalle

**Componentes:**
- `TableGrid`: grid 4 columnas de `TableCard`
- `TableCard`: número Newsreader 20px, badge estado (Libre/Ocupada/Reservada), capacidad, tiempo
- `TableDetail`: info mesa seleccionada, pedidos activos, total consumido, botones de acción

---

## 8. Animaciones (Framer Motion)

### 8.1 Transiciones de página

```jsx
// En AppRoutes.jsx
const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 }
};

<AnimatePresence mode="wait">
  <motion.div
    key={location.pathname}
    variants={pageVariants}
    initial="initial"
    animate="animate"
    exit="exit"
    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
  >
    <Outlet />
  </motion.div>
</AnimatePresence>
```

### 8.2 Animaciones de cards

```jsx
// Stagger en grid de productos
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 }
};
```

### 8.3 Micro-interacciones

- Botones: `whileTap={{ scale: 0.98 }}`
- Cards hover: `whileHover={{ y: -2 }}`
- Modal: `initial={{ opacity: 0, scale: 0.95 }}`, `animate={{ opacity: 1, scale: 1 }}`
- Badge de notificación: `animate={{ scale: [1, 1.2, 1] }}` con repeat infinito

---

## 9. Iconos (Bootstrap Icons)

**Instalación:** `npm install bootstrap-icons`

**Uso:**
```jsx
import 'bootstrap-icons/font/bootstrap-icons.css';

<i className="bi bi-cart"></i>
<i className="bi bi-cash-register"></i>
<i className="bi bi-grid"></i>
<i className="bi bi-clipboard"></i>
<i className="bi bi-people"></i>
<i className="bi bi-box"></i>
<i className="bi bi-search"></i>
<i className="bi bi-bell"></i>
<i className="bi bi-plus-lg"></i>
<i className="bi bi-dash-lg"></i>
```

---

## 10. Dependencias a instalar

```bash
npm install bootstrap bootstrap-icons framer-motion
```

**En `main.jsx`:**
```jsx
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './styles/tokens.css';
import './styles/bootstrap-theme.css';
import './styles/components.css';
import './styles/app.css';
```

---

## 11. Criterios de Aceptación

1. **Visual:** Las pantallas coinciden con el prototipo Stitch aprobado
2. **Componentes:** Todos los componentes base funcionan y son reutilizables
3. **Responsive:** Layout funciona en desktop (1200px+), tablet (768-1199px) y móvil (<768px)
4. **Animaciones:** Transiciones suaves sin afectar rendimiento
5. **Iconos:** Bootstrap Icons renderizan correctamente en toda la app
6. **Accesibilidad:** Contraste WCAG AA, navegación por teclado, labels en inputs
7. **Sin genérico:** No se ve "bootstrap genérico" — tema personalizado visible

---

## 12. Fuente de Verdad

- **Prototipo visual:** Stitch proyecto `POS Heladería - Diseño Visual` (ID: 10580476829389076176)
- **Marca:** Helados Pariente
- **Paleta:** Crema `#FAF9F7`, Terracota `#C2410C`, Carbón `#1C1917`
- **Tipografía:** Newsreader (headings) + Inter (body)
