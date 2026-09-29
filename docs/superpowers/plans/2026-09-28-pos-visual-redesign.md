# Rediseño Visual POS — Helados Pariente Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar completamente el frontend del POS con Bootstrap 5, Bootstrap Icons, Framer Motion y tema personalizado "Helados Pariente".

**Architecture:** Bootstrap 5 como framework CSS base con tema personalizado mediante variables CSS. Componentes React reutilizables con Framer Motion para animaciones sutiles. Layout con sidebar oscuro + header + contenido principal.

**Tech Stack:** React 18, Vite 5, Bootstrap 5.3, Bootstrap Icons 1.11, Framer Motion 11, React Router DOM 6, Supabase JS 2.

## Global Constraints

- **Marca:** Helados Pariente
- **Paleta:** Crema `#FAF9F7`, Terracota `#C2410C`, Carbón `#1C1917`
- **Tipografía:** Newsreader (headings) + Inter (body)
- **Iconos:** Bootstrap Icons 1.11+
- **Animaciones:** Framer Motion 11+ (sutiles, sin exagerar)
- **Lenguaje:** JavaScript (JSX), no TypeScript
- **Sin gradientes, sin glassmorphism, sin neumorfismo**
- **Diseño plano con jerarquía clara**

---

## File Structure

```
pos/frontend/src/
├── main.jsx                          # Actualizar: imports de Bootstrap + fuentes
├── App.jsx                           # Actualizar: AnimatePresence para transiciones
├── styles/
│   ├── tokens.css                    # Reemplazar: nueva paleta + tipografía
│   ├── bootstrap-theme.css           # Crear: overrides de variables Bootstrap
│   ├── components.css                # Reemplazar: componentes personalizados
│   └── app.css                       # Reemplazar: layout + sidebar + header
├── layouts/
│   ├── MainLayout.jsx                # Actualizar: sidebar + header + outlet
│   ├── Sidebar.jsx                   # Reemplazar: Bootstrap Icons + nuevo diseño
│   ├── Header.jsx                    # Crear: barra superior
│   └── AuthLayout.jsx                # Actualizar: tema login
├── components/
│   ├── ui/
│   │   ├── Button.jsx                # Crear: variantes + iconos
│   │   ├── Card.jsx                  # Crear: card base
│   │   ├── Badge.jsx                 # Crear: badges de estado
│   │   ├── Input.jsx                 # Crear: input con icono
│   │   ├── Modal.jsx                 # Crear: modal con Framer Motion
│   │   ├── DataTable.jsx             # Crear: tabla con paginación
│   │   ├── Alert.jsx                 # Crear: alertas
│   │   ├── Skeleton.jsx              # Crear: skeleton loader
│   │   ├── EmptyState.jsx            # Crear: estado vacío
│   │   └── Avatar.jsx                # Crear: avatar circular
│   └── layout/
│       └── (ya existen en layouts/)
├── pages/
│   ├── dashboard/DashboardPage.jsx   # Reemplazar: nuevo diseño
│   ├── ventas/VentasPage.jsx         # Reemplazar: nuevo diseño
│   ├── caja/CajaPage.jsx             # Reemplazar: nuevo diseño
│   ├── mesas/MesasPage.jsx           # Reemplazar: nuevo diseño
│   └── auth/LoginPage.jsx            # Actualizar: tema login
└── utils/
    ├── format.js                     # Crear: formato moneda, fechas
    └── constants.js                  # Crear: constantes de la app
```

---

### Task 1: Instalar dependencias y configurar fuentes

**Files:**
- Modify: `pos/frontend/package.json`
- Modify: `pos/frontend/index.html`
- Modify: `pos/frontend/src/main.jsx`

**Interfaces:**
- Consumes: nada (setup inicial)
- Produces: dependencias instaladas, fuentes Google cargadas, imports de Bootstrap en main.jsx

- [ ] **Step 1: Instalar dependencias**

```bash
cd pos/frontend
npm install bootstrap bootstrap-icons framer-motion
```

- [ ] **Step 2: Agregar fuentes Google en index.html**

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Newsreader:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&display=swap" rel="stylesheet">
```

- [ ] **Step 3: Actualizar main.jsx con imports de Bootstrap**

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './styles/tokens.css';
import './styles/bootstrap-theme.css';
import './styles/components.css';
import './styles/app.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 4: Verificar que la app compila**

```bash
cd pos/frontend
npm run build
```

Expected: Build exitoso sin errores

- [ ] **Step 5: Commit**

```bash
git add pos/frontend/package.json pos/frontend/package-lock.json pos/frontend/index.html pos/frontend/src/main.jsx
git commit -m "feat: install bootstrap, bootstrap-icons, framer-motion and configure fonts"
```

---

### Task 2: Crear tokens.css con nueva paleta y tipografía

**Files:**
- Modify: `pos/frontend/src/styles/tokens.css`

**Interfaces:**
- Consumes: nada
- Produces: variables CSS `--bs-*`, `--font-*`, `--shadow-*`, `--sidebar-*`

- [ ] **Step 1: Reemplazar tokens.css con nueva paleta**

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

  /* Tipografía */
  --bs-font-sans-serif: 'Inter', system-ui, -apple-system, sans-serif;
  --bs-font-serif: 'Newsreader', Georgia, serif;

  /* Shape */
  --bs-border-radius: 0.5rem;
  --bs-border-radius-sm: 0.375rem;
  --bs-border-radius-lg: 0.75rem;
  --bs-border-radius-xl: 1rem;
  --bs-border-radius-pill: 50rem;

  /* Sombras */
  --shadow-card: 0 1px 3px rgba(28, 25, 23, 0.04), 0 1px 2px rgba(28, 25, 23, 0.02);
  --shadow-hover: 0 4px 12px -2px rgba(28, 25, 23, 0.08), 0 2px 6px -1px rgba(28, 25, 23, 0.04);
  --shadow-modal: 0 20px 25px -5px rgba(28, 25, 23, 0.12), 0 8px 10px -6px rgba(28, 25, 23, 0.06);

  /* Z-index */
  --z-dropdown: 10;
  --z-sticky: 20;
  --z-modal-backdrop: 30;
  --z-modal: 40;
  --z-toast: 50;

  /* Motion */
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --duration: 200ms;
}

* { box-sizing: border-box; }

body {
  font-family: var(--bs-font-sans-serif);
  margin: 0;
  background: var(--bs-body-bg);
  color: var(--bs-body-color);
  font-size: 1rem;
  line-height: 1.4;
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--bs-font-serif);
  line-height: 1.2;
  margin: 0 0 0.5em;
}

h1 { font-size: 2rem; }
h2 { font-size: 1.5rem; }
h3 { font-size: 1.25rem; }
h4 { font-size: 1.125rem; }

p { margin: 0 0 0.75em; }
a { color: var(--bs-primary); }

::selection { background: var(--bs-primary-light); }

:focus-visible {
  outline: 2px solid var(--bs-primary);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 2: Verificar que la app compila**

```bash
cd pos/frontend
npm run build
```

Expected: Build exitoso

- [ ] **Step 3: Commit**

```bash
git add pos/frontend/src/styles/tokens.css
git commit -m "feat: update tokens.css with Helados Pariente palette"
```

---

### Task 3: Crear bootstrap-theme.css con overrides de Bootstrap

**Files:**
- Create: `pos/frontend/src/styles/bootstrap-theme.css`

**Interfaces:**
- Consumes: variables CSS de tokens.css
- Produces: overrides de componentes Bootstrap con tema personalizado

- [ ] **Step 1: Crear bootstrap-theme.css**

```css
/* Bootstrap Theme Overrides — Helados Pariente */

/* Botones */
.btn-primary {
  --bs-btn-bg: #C2410C;
  --bs-btn-border-color: #C2410C;
  --bs-btn-hover-bg: #9A3412;
  --bs-btn-hover-border-color: #9A3412;
  --bs-btn-active-bg: #7C2D12;
  --bs-btn-active-border-color: #7C2D12;
  --bs-btn-color: #FFFFFF;
}

.btn-secondary {
  --bs-btn-bg: #FFFFFF;
  --bs-btn-border-color: #E7E5E4;
  --bs-btn-hover-bg: #F5F5F4;
  --bs-btn-hover-border-color: #D6D3D1;
  --bs-btn-active-bg: #F5F5F4;
  --bs-btn-active-border-color: #D6D3D1;
  --bs-btn-color: #1C1917;
}

.btn-success {
  --bs-btn-bg: #059669;
  --bs-btn-border-color: #059669;
  --bs-btn-hover-bg: #047857;
  --bs-btn-hover-border-color: #047857;
  --bs-btn-color: #FFFFFF;
}

.btn-danger {
  --bs-btn-bg: #B91C1C;
  --bs-btn-border-color: #B91C1C;
  --bs-btn-hover-bg: #991B1B;
  --bs-btn-hover-border-color: #991B1B;
  --bs-btn-color: #FFFFFF;
}

.btn-outline-primary {
  --bs-btn-color: #C2410C;
  --bs-btn-border-color: #C2410C;
  --bs-btn-hover-bg: #C2410C;
  --bs-btn-hover-border-color: #C2410C;
  --bs-btn-hover-color: #FFFFFF;
}

/* Cards */
.card {
  --bs-card-bg: #FFFFFF;
  --bs-card-border-color: #E7E5E4;
  --bs-card-border-radius: 0.75rem;
  box-shadow: 0 1px 3px rgba(28, 25, 23, 0.04);
  transition: box-shadow 0.2s ease;
}

.card:hover {
  box-shadow: 0 4px 12px -2px rgba(28, 25, 23, 0.08);
}

/* Badges */
.badge {
  --bs-badge-font-size: 0.6875rem;
  --bs-badge-font-weight: 600;
  --bs-badge-padding-x: 0.5rem;
  --bs-badge-padding-y: 0.25rem;
  --bs-badge-border-radius: 50rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

/* Forms */
.form-control, .form-select {
  --bs-form-control-bg: #FFFFFF;
  --bs-form-control-border-color: #E7E5E4;
  --bs-form-control-focus-border-color: #C2410C;
  --bs-form-control-focus-box-shadow: 0 0 0 2px rgba(194, 65, 12, 0.15);
  border-radius: 0.5rem;
  min-height: 44px;
}

/* Tables */
.table {
  --bs-table-bg: #FFFFFF;
  --bs-table-border-color: #E7E5E4;
  --bs-table-hover-bg: #FAF9F7;
  --bs-table-header-bg: #F5F0EB;
}

.table thead th {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  color: #78716C;
}

/* Modal */
.modal-content {
  --bs-modal-bg: #FFFFFF;
  --bs-modal-border-radius: 1rem;
  --bs-modal-border-color: transparent;
  box-shadow: 0 20px 25px -5px rgba(28, 25, 23, 0.12), 0 8px 10px -6px rgba(28, 25, 23, 0.06);
}

.modal-backdrop {
  --bs-backdrop-bg: #1C1917;
  --bs-backdrop-opacity: 0.4;
}

/* Nav tabs */
.nav-tabs {
  --bs-nav-tabs-border-color: #E7E5E4;
  --bs-nav-tabs-link-active-color: #C2410C;
  --bs-nav-tabs-link-active-border-color: #C2410C;
  --bs-nav-tabs-link-hover-border-color: #E7E5E4;
}

/* Alerts */
.alert {
  --bs-alert-border-radius: 0.5rem;
  --bs-alert-padding-x: 1rem;
  --bs-alert-padding-y: 0.75rem;
}
```

- [ ] **Step 2: Verificar que la app compila**

```bash
cd pos/frontend
npm run build
```

Expected: Build exitoso

- [ ] **Step 3: Commit**

```bash
git add pos/frontend/src/styles/bootstrap-theme.css
git commit -m "feat: create bootstrap-theme.css with Helados Pariente overrides"
```

---

### Task 4: Crear componentes UI base — Button, Card, Badge

**Files:**
- Create: `pos/frontend/src/components/ui/Button.jsx`
- Create: `pos/frontend/src/components/ui/Card.jsx`
- Create: `pos/frontend/src/components/ui/Badge.jsx`

**Interfaces:**
- Consumes: nada
- Produces: `Button`, `Card`, `Badge` componentes reutilizables

- [ ] **Step 1: Crear Button.jsx**

```jsx
import { motion } from 'framer-motion';

const variantMap = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  success: 'btn-success',
  danger: 'btn-danger',
  outline: 'btn-outline-primary',
  ghost: 'btn-link',
};

const sizeMap = {
  sm: 'btn-sm',
  md: '',
  lg: 'btn-lg',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  icon,
  children,
  className = '',
  ...props
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      className={`btn ${variantMap[variant]} ${sizeMap[size]} ${className}`}
      {...props}
    >
      {icon && <i className={`bi ${icon} me-2`}></i>}
      {children}
    </motion.button>
  );
}
```

- [ ] **Step 2: Crear Card.jsx**

```jsx
import { motion } from 'framer-motion';

export default function Card({ children, className = '', hover = true, ...props }) {
  return (
    <motion.div
      whileHover={hover ? { y: -2 } : undefined}
      className={`card ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 3: Crear Badge.jsx**

```jsx
const variantMap = {
  success: 'bg-success',
  danger: 'bg-danger',
  warning: 'bg-warning',
  info: 'bg-info',
  secondary: 'bg-secondary',
  light: 'bg-light text-dark',
};

export default function Badge({ variant = 'secondary', children, className = '' }) {
  return (
    <span className={`badge ${variantMap[variant]} ${className}`}>
      {children}
    </span>
  );
}
```

- [ ] **Step 4: Verificar que la app compila**

```bash
cd pos/frontend
npm run build
```

Expected: Build exitoso

- [ ] **Step 5: Commit**

```bash
git add pos/frontend/src/components/ui/Button.jsx pos/frontend/src/components/ui/Card.jsx pos/frontend/src/components/ui/Badge.jsx
git commit -m "feat: create base UI components (Button, Card, Badge)"
```

---

### Task 5: Crear componentes UI — Input, Modal, DataTable

**Files:**
- Create: `pos/frontend/src/components/ui/Input.jsx`
- Create: `pos/frontend/src/components/ui/Modal.jsx`
- Create: `pos/frontend/src/components/ui/DataTable.jsx`

**Interfaces:**
- Consumes: nada
- Produces: `Input`, `Modal`, `DataTable` componentes

- [ ] **Step 1: Crear Input.jsx**

```jsx
export default function Input({
  icon,
  label,
  error,
  className = '',
  ...props
}) {
  return (
    <div className="mb-3">
      {label && <label className="form-label">{label}</label>}
      <div className="input-group">
        {icon && (
          <span className="input-group-text">
            <i className={`bi ${icon}`}></i>
          </span>
        )}
        <input className={`form-control ${error ? 'is-invalid' : ''} ${className}`} {...props} />
        {error && <div className="invalid-feedback">{error}</div>}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Crear Modal.jsx**

```jsx
import { motion, AnimatePresence } from 'framer-motion';

export default function Modal({ show, onClose, title, children, footer }) {
  return (
    <AnimatePresence>
      {show && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-backdrop fade show"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="modal fade show d-block"
            tabIndex="-1"
          >
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">{title}</h5>
                  <button type="button" className="btn-close" onClick={onClose}></button>
                </div>
                <div className="modal-body">{children}</div>
                {footer && <div className="modal-footer">{footer}</div>}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 3: Crear DataTable.jsx**

```jsx
export default function DataTable({ columns, data, pageSize = 10 }) {
  return (
    <div className="table-responsive">
      <table className="table table-hover">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              {columns.map((col) => (
                <td key={col.key}>{col.render ? col.render(row) : row[col.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: Verificar que la app compila**

```bash
cd pos/frontend
npm run build
```

Expected: Build exitoso

- [ ] **Step 5: Commit**

```bash
git add pos/frontend/src/components/ui/Input.jsx pos/frontend/src/components/ui/Modal.jsx pos/frontend/src/components/ui/DataTable.jsx
git commit -m "feat: create UI components (Input, Modal, DataTable)"
```

---

### Task 6: Crear componentes UI — Alert, Skeleton, EmptyState, Avatar

**Files:**
- Create: `pos/frontend/src/components/ui/Alert.jsx`
- Create: `pos/frontend/src/components/ui/Skeleton.jsx`
- Create: `pos/frontend/src/components/ui/EmptyState.jsx`
- Create: `pos/frontend/src/components/ui/Avatar.jsx`

**Interfaces:**
- Consumes: nada
- Produces: `Alert`, `Skeleton`, `EmptyState`, `Avatar` componentes

- [ ] **Step 1: Crear Alert.jsx**

```jsx
const variantMap = {
  success: 'alert-success',
  danger: 'alert-danger',
  warning: 'alert-warning',
  info: 'alert-info',
};

export default function Alert({ variant = 'info', icon, children, className = '' }) {
  return (
    <div className={`alert ${variantMap[variant]} d-flex align-items-center ${className}`} role="alert">
      {icon && <i className={`bi ${icon} me-2`}></i>}
      <div>{children}</div>
    </div>
  );
}
```

- [ ] **Step 2: Crear Skeleton.jsx**

```jsx
export default function Skeleton({ width = '100%', height = '1rem', className = '' }) {
  return (
    <div
      className={`placeholder-glow ${className}`}
      style={{ width, height }}
    >
      <span className="placeholder w-100 h-100"></span>
    </div>
  );
}
```

- [ ] **Step 3: Crear EmptyState.jsx**

```jsx
export default function EmptyState({ icon = 'bi-inbox', title, description, action }) {
  return (
    <div className="text-center py-5">
      <i className={`bi ${icon} fs-1 text-muted mb-3`}></i>
      <h5 className="text-muted">{title}</h5>
      {description && <p className="text-muted">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
```

- [ ] **Step 4: Crear Avatar.jsx**

```jsx
export default function Avatar({ name = '', size = 'md', className = '' }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const sizeMap = {
    sm: '32px',
    md: '40px',
    lg: '56px',
  };

  return (
    <div
      className={`rounded-circle bg-primary text-white d-flex align-items-center justify-content-center ${className}`}
      style={{ width: sizeMap[size], height: sizeMap[size], fontSize: size === 'sm' ? '0.75rem' : '1rem' }}
    >
      {initials}
    </div>
  );
}
```

- [ ] **Step 5: Verificar que la app compila**

```bash
cd pos/frontend
npm run build
```

Expected: Build exitoso

- [ ] **Step 6: Commit**

```bash
git add pos/frontend/src/components/ui/Alert.jsx pos/frontend/src/components/ui/Skeleton.jsx pos/frontend/src/components/ui/EmptyState.jsx pos/frontend/src/components/ui/Avatar.jsx
git commit -m "feat: create UI components (Alert, Skeleton, EmptyState, Avatar)"
```

---

### Task 7: Actualizar Sidebar con Bootstrap Icons y nuevo diseño

**Files:**
- Modify: `pos/frontend/src/layouts/Sidebar.jsx`
- Modify: `pos/frontend/src/styles/app.css`

**Interfaces:**
- Consumes: `useAuth`, `usePermisos` de contextos existentes
- Produces: Sidebar con navegación por grupos, iconos Bootstrap, indicador de sección activa

- [ ] **Step 1: Reemplazar Sidebar.jsx**

```jsx
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { usePermisos } from '../context/PermisosContext.jsx';

const GRUPOS = [
  {
    titulo: 'Operación',
    enlaces: [
      { to: '/dashboard', texto: 'Dashboard', icono: 'bi-grid', permiso: null },
      { to: '/ventas', texto: 'Ventas', icono: 'bi-cart', permiso: 'venta.consultar' },
      { to: '/caja', texto: 'Caja', icono: 'bi-cash-register', permiso: 'turno.consultar' },
      { to: '/pedidos', texto: 'Pedidos', icono: 'bi-clipboard', permiso: 'pedido.consultar' },
      { to: '/mesas', texto: 'Mesas', icono: 'bi-grid-3x3', permiso: 'mesa.consultar' },
    ],
  },
  {
    titulo: 'Catálogo',
    enlaces: [
      { to: '/catalogo/productos', texto: 'Productos', icono: 'bi-box', permiso: 'producto.consultar' },
      { to: '/catalogo/inventario', texto: 'Inventario', icono: 'bi-boxes', permiso: 'inventario.consultar' },
      { to: '/catalogo/recetas', texto: 'Recetas', icono: 'bi-journal-text', permiso: 'producto.consultar' },
      { to: '/catalogo/clientes', texto: 'Clientes', icono: 'bi-people', permiso: 'cliente.consultar' },
      { to: '/catalogo/promociones', texto: 'Promociones', icono: 'bi-tag', permiso: 'promocion.consultar' },
    ],
  },
  {
    titulo: 'Sistema',
    enlaces: [
      { to: '/integracion', texto: 'Integración', icono: 'bi-gear', permiso: 'integracion.consultar' },
      { to: '/auditoria', texto: 'Auditoría', icono: 'bi-shield', permiso: 'auditoria.consultar' },
      { to: '/usuarios', texto: 'Usuarios', icono: 'bi-person-gear', permiso: 'usuario.gestionar' },
    ],
  },
];

export default function Sidebar() {
  const { session, signOut } = useAuth();
  const { tienePermiso } = usePermisos();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-name">Helados Pariente</span>
      </div>
      <nav className="sidebar-nav">
        {GRUPOS.map((g) => (
          <div key={g.titulo} className="sidebar-group">
            <div className="sidebar-group-title">{g.titulo}</div>
            {g.enlaces
              .filter((e) => e.permiso === null || tienePermiso(e.permiso))
              .map((e) => (
                <NavLink
                  key={e.to}
                  to={e.to}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                >
                  <i className={`bi ${e.icono}`}></i>
                  <span>{e.texto}</span>
                </NavLink>
              ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="user-email">{session?.user?.email}</div>
          <button className="btn btn-sm btn-outline-light" onClick={signOut}>
            <i className="bi bi-box-arrow-right me-1"></i>
            Salir
          </button>
        </div>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Actualizar app.css con estilos del sidebar**

```css
/* Layout */
.layout {
  display: flex;
  min-height: 100vh;
}

/* Sidebar */
.sidebar {
  width: 220px;
  flex-shrink: 0;
  background: #1C1917;
  color: #FAF9F7;
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  height: 100vh;
  box-sizing: border-box;
}

.sidebar-brand {
  padding: 20px 16px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 12px;
}

.brand-name {
  font-family: 'Newsreader', Georgia, serif;
  font-style: italic;
  font-size: 1.25rem;
  font-weight: 600;
  color: #FAF9F7;
}

.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px;
}

.sidebar-group {
  margin-bottom: 16px;
}

.sidebar-group-title {
  padding: 8px 12px 4px;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #78716C;
  font-weight: 600;
}

.sidebar-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  color: #D6D3D1;
  text-decoration: none;
  font-size: 0.875rem;
  border-radius: 6px;
  margin-bottom: 2px;
  transition: background 0.15s ease, color 0.15s ease;
  position: relative;
}

.sidebar-link i {
  font-size: 1.125rem;
  width: 20px;
  text-align: center;
}

.sidebar-link:hover {
  background: #292524;
  color: #FAF9F7;
}

.sidebar-link.active {
  background: #C2410C;
  color: #FFFFFF;
}

.sidebar-link.active::before {
  content: '';
  position: absolute;
  left: -8px;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 24px;
  background: #C2410C;
  border-radius: 0 2px 2px 0;
}

.sidebar-footer {
  padding: 12px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.sidebar-user {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.user-email {
  font-size: 0.8rem;
  color: #A8A29E;
  word-break: break-all;
}

/* Content */
.content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

/* Header */
.header {
  height: 64px;
  background: #FFFFFF;
  border-bottom: 1px solid #E7E5E4;
  display: flex;
  align-items: center;
  padding: 0 24px;
  gap: 16px;
  position: sticky;
  top: 0;
  z-index: 10;
}

.header-title {
  font-family: 'Newsreader', Georgia, serif;
  font-size: 1.5rem;
  font-weight: 600;
  color: #1C1917;
  margin: 0;
}

.header-breadcrumb {
  font-size: 0.75rem;
  color: #78716C;
}

.header-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 12px;
}

/* Main content area */
.main-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

/* Auth */
.auth-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1C1917;
}

.auth-card {
  background: #FFFFFF;
  border-radius: 16px;
  padding: 32px;
  width: 360px;
  box-shadow: 0 20px 25px -5px rgba(28, 25, 23, 0.12);
}

.auth-card h1 {
  font-family: 'Newsreader', Georgia, serif;
  font-size: 1.5rem;
  font-weight: 600;
  text-align: center;
  margin-bottom: 24px;
  color: #1C1917;
}

/* Utility */
.text-muted {
  color: #78716C !important;
}

.bg-soft-primary {
  background-color: #FEF3C7;
}
```

- [ ] **Step 3: Verificar que la app compila**

```bash
cd pos/frontend
npm run build
```

Expected: Build exitoso

- [ ] **Step 4: Commit**

```bash
git add pos/frontend/src/layouts/Sidebar.jsx pos/frontend/src/styles/app.css
git commit -m "feat: update Sidebar with Bootstrap Icons and new design"
```

---

### Task 8: Crear Header y actualizar MainLayout

**Files:**
- Create: `pos/frontend/src/layouts/Header.jsx`
- Modify: `pos/frontend/src/layouts/MainLayout.jsx`

**Interfaces:**
- Consumes: `useAuth` de contexto
- Produces: `Header` componente, `MainLayout` actualizado

- [ ] **Step 1: Crear Header.jsx**

```jsx
import { useAuth } from '../context/AuthContext.jsx';
import Avatar from '../components/ui/Avatar.jsx';

export default function Header({ title, breadcrumb }) {
  const { session } = useAuth();
  const userName = session?.user?.user_metadata?.name || session?.user?.email || 'Usuario';

  return (
    <header className="header">
      <div>
        <h1 className="header-title">{title}</h1>
        {breadcrumb && <div className="header-breadcrumb">{breadcrumb}</div>}
      </div>
      <div className="header-actions">
        <button className="btn btn-sm btn-outline-secondary position-relative">
          <i className="bi bi-bell"></i>
          <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
            2
          </span>
        </button>
        <Avatar name={userName} size="md" />
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Actualizar MainLayout.jsx**

```jsx
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';

const TITULOS = {
  '/dashboard': { title: 'Panel Principal', breadcrumb: 'Hoy, 28 sept 2026' },
  '/ventas': { title: 'Punto de Venta', breadcrumb: 'Nueva venta' },
  '/caja': { title: 'Caja / Turno Actual', breadcrumb: 'Turno Mañana' },
  '/pedidos': { title: 'Pedidos', breadcrumb: 'Gestión de pedidos' },
  '/mesas': { title: 'Gestión de Salón y Mesas', breadcrumb: '12/20 mesas ocupadas' },
  '/catalogo/productos': { title: 'Productos', breadcrumb: 'Catálogo' },
  '/catalogo/inventario': { title: 'Inventario', breadcrumb: 'Catálogo' },
  '/catalogo/recetas': { title: 'Recetas', breadcrumb: 'Catálogo' },
  '/catalogo/clientes': { title: 'Clientes', breadcrumb: 'Catálogo' },
  '/catalogo/promociones': { title: 'Promociones', breadcrumb: 'Catálogo' },
  '/integracion': { title: 'Integración', breadcrumb: 'Sistema' },
  '/auditoria': { title: 'Auditoría', breadcrumb: 'Sistema' },
  '/usuarios': { title: 'Usuarios', breadcrumb: 'Sistema' },
};

export default function MainLayout() {
  const location = useLocation();
  const { title, breadcrumb } = TITULOS[location.pathname] || { title: 'Helados Pariente', breadcrumb: '' };

  return (
    <div className="layout">
      <Sidebar />
      <div className="content">
        <Header title={title} breadcrumb={breadcrumb} />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verificar que la app compila**

```bash
cd pos/frontend
npm run build
```

Expected: Build exitoso

- [ ] **Step 4: Commit**

```bash
git add pos/frontend/src/layouts/Header.jsx pos/frontend/src/layouts/MainLayout.jsx
git commit -m "feat: create Header and update MainLayout"
```

---

### Task 9: Actualizar App.jsx con AnimatePresence

**Files:**
- Modify: `pos/frontend/src/App.jsx`
- Modify: `pos/frontend/src/routes/AppRoutes.jsx`

**Interfaces:**
- Consumes: `AuthProvider`, `PermisosProvider`, `AppRoutes`
- Produces: App con transiciones de página

- [ ] **Step 1: Actualizar AppRoutes.jsx con AnimatePresence**

```jsx
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import MainLayout from '../layouts/MainLayout.jsx';
import AuthLayout from '../layouts/AuthLayout.jsx';
import RequirePermiso from '../components/common/RequirePermiso.jsx';
import LoginPage from '../pages/auth/LoginPage.jsx';
import DashboardPage from '../pages/dashboard/DashboardPage.jsx';
import VentasPage from '../pages/ventas/VentasPage.jsx';
import CajaPage from '../pages/caja/CajaPage.jsx';
import PedidosPage from '../pages/pedidos/PedidosPage.jsx';
import MesasPage from '../pages/mesas/MesasPage.jsx';
import ProductosPage from '../pages/catalogo/ProductosPage.jsx';
import InventarioPage from '../pages/catalogo/InventarioPage.jsx';
import RecetasPage from '../pages/catalogo/RecetasPage.jsx';
import ClientesPage from '../pages/clientes/ClientesPage.jsx';
import PromocionesPage from '../pages/promociones/PromocionesPage.jsx';
import UsuariosPage from '../pages/usuarios/UsuariosPage.jsx';
import AuditoriaPage from '../pages/auditoria/AuditoriaPage.jsx';
import IntegracionPage from '../pages/integracion/IntegracionPage.jsx';

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export default function AppRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/ventas" element={<RequirePermiso permiso="venta.consultar"><VentasPage /></RequirePermiso>} />
          <Route path="/caja" element={<RequirePermiso permiso="turno.consultar"><CajaPage /></RequirePermiso>} />
          <Route path="/pedidos" element={<RequirePermiso permiso="pedido.consultar"><PedidosPage /></RequirePermiso>} />
          <Route path="/mesas" element={<RequirePermiso permiso="mesa.consultar"><MesasPage /></RequirePermiso>} />
          <Route path="/catalogo/productos" element={<RequirePermiso permiso="producto.consultar"><ProductosPage /></RequirePermiso>} />
          <Route path="/catalogo/inventario" element={<RequirePermiso permiso="inventario.consultar"><InventarioPage /></RequirePermiso>} />
          <Route path="/catalogo/recetas" element={<RequirePermiso permiso="producto.consultar"><RecetasPage /></RequirePermiso>} />
          <Route path="/catalogo/clientes" element={<RequirePermiso permiso="cliente.consultar"><ClientesPage /></RequirePermiso>} />
          <Route path="/catalogo/promociones" element={<RequirePermiso permiso="promocion.consultar"><PromocionesPage /></RequirePermiso>} />
          <Route path="/integracion" element={<RequirePermiso permiso="integracion.consultar"><IntegracionPage /></RequirePermiso>} />
          <Route path="/auditoria" element={<RequirePermiso permiso="auditoria.consultar"><AuditoriaPage /></RequirePermiso>} />
          <Route path="/usuarios" element={<RequirePermiso permiso="usuario.gestionar"><UsuariosPage /></RequirePermiso>} />
        </Route>
        <Route path="*" element={<LoginPage />} />
      </Routes>
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Verificar que la app compila**

```bash
cd pos/frontend
npm run build
```

Expected: Build exitoso

- [ ] **Step 3: Commit**

```bash
git add pos/frontend/src/routes/AppRoutes.jsx
git commit -m "feat: add AnimatePresence for page transitions"
```

---

### Task 10: Crear utils (format, constants)

**Files:**
- Create: `pos/frontend/src/utils/format.js`
- Create: `pos/frontend/src/utils/constants.js`

**Interfaces:**
- Consumes: nada
- Produces: `formatCurrency`, `formatDate`, `formatTime`, `CATEGORIAS`, `ESTADOS`

- [ ] **Step 1: Crear format.js**

```jsx
export function formatCurrency(amount) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount);
}

export function formatDate(date) {
  return new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}

export function formatTime(date) {
  return new Intl.DateTimeFormat('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}
```

- [ ] **Step 2: Crear constants.js**

```jsx
export const CATEGORIAS = [
  { id: 'todos', nombre: 'Todos' },
  { id: 'helados', nombre: 'Helados' },
  { id: 'cafe', nombre: 'Café' },
  { id: 'pasteles', nombre: 'Pasteles' },
  { id: 'bebidas', nombre: 'Bebidas' },
];

export const ESTADOS_VENTA = {
  completado: { nombre: 'Completado', variante: 'success' },
  pendiente: { nombre: 'Pendiente', variante: 'warning' },
  anulado: { nombre: 'Anulado', variante: 'danger' },
};

export const ESTADOS_MESA = {
  libre: { nombre: 'Libre', variante: 'success' },
  ocupada: { nombre: 'Ocupada', variante: 'danger' },
  reservada: { nombre: 'Reservada', variante: 'warning' },
};

export const METODOS_PAGO = [
  { id: 'efectivo', nombre: 'Efectivo', icono: 'bi-cash' },
  { id: 'tarjeta', nombre: 'Tarjeta', icono: 'bi-credit-card' },
  { id: 'transferencia', nombre: 'Transferencia', icono: 'bi-bank' },
];
```

- [ ] **Step 3: Verificar que la app compila**

```bash
cd pos/frontend
npm run build
```

Expected: Build exitoso

- [ ] **Step 4: Commit**

```bash
git add pos/frontend/src/utils/format.js pos/frontend/src/utils/constants.js
git commit -m "feat: create utils (format, constants)"
```

---

### Task 11: Actualizar DashboardPage con nuevo diseño

**Files:**
- Modify: `pos/frontend/src/pages/dashboard/DashboardPage.jsx`

**Interfaces:**
- Consumes: `Card`, `Badge`, `formatCurrency` de componentes y utils
- Produces: Dashboard con métricas, gráfico SVG, pedidos recientes, alertas

- [ ] **Step 1: Reemplazar DashboardPage.jsx**

```jsx
import { motion } from 'framer-motion';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { formatCurrency, formatTime } from '../../utils/format.js';

const METRICAS = [
  { titulo: 'Ventas del día', valor: '$1,250.00', tendencia: '+12%', icono: 'bi-cash-stack', color: 'success' },
  { titulo: 'Pedidos activos', valor: '8', tendencia: '+3', icono: 'bi-clipboard', color: 'info' },
  { titulo: 'Mesas ocupadas', valor: '12/20', tendencia: '60%', icono: 'bi-grid-3x3', color: 'warning' },
  { titulo: 'Alertas', valor: '2', tendencia: 'nuevas', icono: 'bi-exclamation-triangle', color: 'danger' },
];

const PEDIDOS = [
  { id: '#1048', hora: '14:45', items: '2x Copa Vainilla, 1x Café Latte', estado: 'preparando' },
  { id: '#1047', hora: '14:30', items: '1x Tiramisú, 2x Americano', estado: 'listo' },
  { id: '#1046', hora: '14:15', items: '3x Helado Pistachio', estado: 'entregado' },
  { id: '#1045', hora: '14:00', items: '1x Cheesecake, 1x Capuchino', estado: 'entregado' },
  { id: '#1044', hora: '13:45', items: '2x Copa Chocolate', estado: 'entregado' },
];

const ESTADOS_PEDIDO = {
  preparando: { nombre: 'Preparando', variante: 'warning' },
  listo: { nombre: 'Listo', variante: 'success' },
  entregado: { nombre: 'Entregado', variante: 'secondary' },
};

const VENTAS_HORA = [
  { hora: '9', valor: 45 }, { hora: '10', valor: 120 }, { hora: '11', valor: 180 },
  { hora: '12', valor: 250 }, { hora: '13', valor: 220 }, { hora: '14', valor: 190 },
  { hora: '15', valor: 150 }, { hora: '16', valor: 95 },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function DashboardPage() {
  const maxValor = Math.max(...VENTAS_HORA.map((v) => v.valor));

  return (
    <motion.div variants={container} initial="hidden" animate="show">
      {/* Métricas */}
      <div className="row g-3 mb-4">
        {METRICAS.map((m) => (
          <div key={m.titulo} className="col-12 col-md-6 col-xl-3">
            <motion.div variants={item}>
              <Card className="h-100">
                <div className="d-flex align-items-center">
                  <div className={`rounded-circle bg-soft-${m.color} p-3 me-3`}>
                    <i className={`bi ${m.icono} text-${m.color} fs-5`}></i>
                  </div>
                  <div>
                    <div className="text-muted small text-uppercase" style={{ fontSize: '0.75rem', letterSpacing: '0.04em' }}>
                      {m.titulo}
                    </div>
                    <div className="fw-bold fs-4">{m.valor}</div>
                    <div className={`text-${m.color} small`}>
                      <i className={`bi bi-arrow-up`}></i> {m.tendencia}
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        ))}
      </div>

      <div className="row g-3">
        {/* Gráfico de ventas */}
        <div className="col-12 col-lg-8">
          <motion.div variants={item}>
            <Card className="h-100">
              <h5 className="mb-3">Ventas por hora</h5>
              <div className="d-flex align-items-end gap-2" style={{ height: '200px' }}>
                {VENTAS_HORA.map((v) => (
                  <div key={v.hora} className="d-flex flex-column align-items-center flex-1">
                    <div
                      className="w-100 rounded"
                      style={{
                        height: `${(v.valor / maxValor) * 100}%`,
                        background: '#C2410C',
                        minHeight: '4px',
                      }}
                    ></div>
                    <small className="text-muted mt-1">{v.hora}h</small>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Alertas */}
        <div className="col-12 col-lg-4">
          <motion.div variants={item}>
            <Card className="h-100">
              <h5 className="mb-3">Alertas</h5>
              <div className="d-flex flex-column gap-2">
                <div className="d-flex align-items-center gap-2 p-2 rounded" style={{ background: '#FEF3C7' }}>
                  <i className="bi bi-exclamation-triangle text-warning"></i>
                  <div>
                    <div className="fw-semibold small">Stock bajo</div>
                    <div className="text-muted small">Vainilla Madagascar</div>
                  </div>
                </div>
                <div className="d-flex align-items-center gap-2 p-2 rounded" style={{ background: '#FEE2E2' }}>
                  <i className="bi bi-clock text-danger"></i>
                  <div>
                    <div className="fw-semibold small">Mesa sin atención</div>
                    <div className="text-muted small">Mesa 4 — 45 min</div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Pedidos recientes */}
      <motion.div variants={item} className="mt-3">
        <Card>
          <h5 className="mb-3">Pedidos recientes</h5>
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Hora</th>
                  <th>Items</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {PEDIDOS.map((p) => (
                  <tr key={p.id}>
                    <td className="fw-semibold">{p.id}</td>
                    <td className="text-muted">{p.hora}</td>
                    <td className="text-muted">{p.items}</td>
                    <td>
                      <Badge variant={ESTADOS_PEDIDO[p.estado].variante}>
                        {ESTADOS_PEDIDO[p.estado].nombre}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
```

- [ ] **Step 2: Verificar que la app compila**

```bash
cd pos/frontend
npm run build
```

Expected: Build exitoso

- [ ] **Step 3: Commit**

```bash
git add pos/frontend/src/pages/dashboard/DashboardPage.jsx
git commit -m "feat: update DashboardPage with new design"
```

---

### Task 12: Actualizar VentasPage con nuevo diseño

**Files:**
- Modify: `pos/frontend/src/pages/ventas/VentasPage.jsx`

**Interfaces:**
- Consumes: `Button`, `Card`, `Badge`, `formatCurrency`, `CATEGORIAS`, `METODOS_PAGO`
- Produces: Ventas con catálogo de productos + ticket de compra

- [ ] **Step 1: Reemplazar VentasPage.jsx**

```jsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import { formatCurrency } from '../../utils/format.js';
import { CATEGORIAS, METODOS_PAGO } from '../../utils/constants.js';

const PRODUCTOS = [
  { id: 1, nombre: 'Vainilla Madagascar', precio: 28, categoria: 'helados', color: '#FEF3C7' },
  { id: 2, nombre: 'Pistachio Siciliano', precio: 32, categoria: 'helados', color: '#D1FAE5' },
  { id: 3, nombre: 'Dulce de Leche', precio: 30, categoria: 'helados', color: '#FED7AA' },
  { id: 4, nombre: 'Chocolate Belga', precio: 30, categoria: 'helados', color: '#92400E' },
  { id: 5, nombre: 'Café de Origen', precio: 45, categoria: 'cafe', color: '#92400E' },
  { id: 6, nombre: 'Cappuccino', precio: 50, categoria: 'cafe', color: '#D6D3D1' },
  { id: 7, nombre: 'Tiramisú', precio: 65, categoria: 'pasteles', color: '#FEF3C7' },
  { id: 8, nombre: 'Cheesecake', precio: 60, categoria: 'pasteles', color: '#FED7AA' },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function VentasPage() {
  const [categoriaActiva, setCategoriaActiva] = useState('todos');
  const [ticket, setTicket] = useState([]);

  const productosFiltrados = categoriaActiva === 'todos'
    ? PRODUCTOS
    : PRODUCTOS.filter((p) => p.categoria === categoriaActiva);

  const agregarProducto = (producto) => {
    setTicket((prev) => {
      const existente = prev.find((i) => i.id === producto.id);
      if (existente) {
        return prev.map((i) => i.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      }
      return [...prev, { ...producto, cantidad: 1 }];
    });
  };

  const actualizarCantidad = (id, delta) => {
    setTicket((prev) =>
      prev
        .map((i) => i.id === id ? { ...i, cantidad: i.cantidad + delta } : i)
        .filter((i) => i.cantidad > 0)
    );
  };

  const subtotal = ticket.reduce((sum, i) => sum + i.precio * i.cantidad, 0);
  const iva = subtotal * 0.16;
  const total = subtotal + iva;

  return (
    <div className="row g-3">
      {/* Catálogo */}
      <div className="col-12 col-lg-8">
        <div className="d-flex flex-column gap-3">
          {/* Buscador */}
          <div className="input-group">
            <span className="input-group-text">
              <i className="bi bi-search"></i>
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Buscar sabor o producto..."
            />
          </div>

          {/* Categorías */}
          <div className="nav nav-tabs">
            {CATEGORIAS.map((cat) => (
              <button
                key={cat.id}
                className={`nav-link ${categoriaActiva === cat.id ? 'active' : ''}`}
                onClick={() => setCategoriaActiva(cat.id)}
              >
                {cat.nombre}
              </button>
            ))}
          </div>

          {/* Grid de productos */}
          <motion.div className="row g-3" variants={container} initial="hidden" animate="show">
            {productosFiltrados.map((p) => (
              <div key={p.id} className="col-6 col-md-4 col-xl-3">
                <motion.div variants={item}>
                  <Card
                    className="h-100 cursor-pointer"
                    onClick={() => agregarProducto(p)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div
                      className="rounded mb-2"
                      style={{ height: '80px', background: p.color }}
                    ></div>
                    <h6 className="mb-1" style={{ fontFamily: 'Newsreader, serif' }}>
                      {p.nombre}
                    </h6>
                    <div className="fw-bold text-primary">{formatCurrency(p.precio)}</div>
                  </Card>
                </motion.div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Ticket */}
      <div className="col-12 col-lg-4">
        <Card className="sticky-top" style={{ top: '80px' }}>
          <h5 className="mb-3">Ticket Actual</h5>

          {ticket.length === 0 ? (
            <div className="text-center text-muted py-4">
              <i className="bi bi-cart fs-1"></i>
              <p className="mt-2">Agrega productos al ticket</p>
            </div>
          ) : (
            <>
              <div className="d-flex flex-column gap-2 mb-3">
                {ticket.map((i) => (
                  <div key={i.id} className="d-flex align-items-center justify-content-between">
                    <div>
                      <div className="fw-semibold small">{i.nombre}</div>
                      <div className="text-muted small">{formatCurrency(i.precio)}</div>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <button className="btn btn-sm btn-outline-secondary" onClick={() => actualizarCantidad(i.id, -1)}>
                        <i className="bi bi-dash"></i>
                      </button>
                      <span className="fw-semibold">{i.cantidad}</span>
                      <button className="btn btn-sm btn-outline-secondary" onClick={() => actualizarCantidad(i.id, 1)}>
                        <i className="bi bi-plus"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <hr />

              <div className="d-flex justify-content-between mb-1">
                <span className="text-muted">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="d-flex justify-content-between mb-1">
                <span className="text-muted">IVA (16%)</span>
                <span>{formatCurrency(iva)}</span>
              </div>
              <div className="d-flex justify-content-between mb-3">
                <span className="fw-bold">Total</span>
                <span className="fw-bold fs-5 text-primary">{formatCurrency(total)}</span>
              </div>

              <div className="d-grid gap-2">
                {METODOS_PAGO.map((m) => (
                  <Button key={m.id} variant="secondary" icon={m.icono}>
                    {m.nombre}
                  </Button>
                ))}
                <Button variant="primary" size="lg" icon="bi-cash-stack" className="mt-2">
                  Cobrar {formatCurrency(total)}
                </Button>
                <Button variant="ghost" onClick={() => setTicket([])}>
                  Limpiar
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar que la app compila**

```bash
cd pos/frontend
npm run build
```

Expected: Build exitoso

- [ ] **Step 3: Commit**

```bash
git add pos/frontend/src/pages/ventas/VentasPage.jsx
git commit -m "feat: update VentasPage with new design"
```

---

### Task 13: Actualizar CajaPage con nuevo diseño

**Files:**
- Modify: `pos/frontend/src/pages/caja/CajaPage.jsx`

**Interfaces:**
- Consumes: `Card`, `Badge`, `Button`, `formatCurrency`
- Produces: Caja con resumen de turno + tabla de transacciones

- [ ] **Step 1: Reemplazar CajaPage.jsx**

```jsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import { formatCurrency, formatTime } from '../../utils/format.js';

const TRANSACCIONES = [
  { id: '#1048', hora: '14:45', monto: 28.50, metodo: 'Efectivo', estado: 'completado' },
  { id: '#1047', hora: '14:30', monto: 15.40, metodo: 'Tarjeta', estado: 'completado' },
  { id: '#1046', hora: '14:15', monto: 45.00, metodo: 'Transferencia', estado: 'completado' },
  { id: '#1045', hora: '14:00', monto: 65.00, metodo: 'Tarjeta', estado: 'completado' },
  { id: '#1044', hora: '13:45', monto: 32.00, metodo: 'Efectivo', estado: 'completado' },
  { id: '#1043', hora: '13:30', monto: 50.00, metodo: 'Tarjeta', estado: 'anulado' },
  { id: '#1042', hora: '13:15', monto: 28.00, metodo: 'Efectivo', estado: 'completado' },
  { id: '#1041', hora: '13:00', monto: 42.00, metodo: 'Transferencia', estado: 'completado' },
];

const ESTADOS = {
  completado: { nombre: 'Completado', variante: 'success' },
  anulado: { nombre: 'Anulado', variante: 'danger' },
  pendiente: { nombre: 'Pendiente', variante: 'warning' },
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function CajaPage() {
  const [filtroMetodo, setFiltroMetodo] = useState('todos');

  const transaccionesFiltradas = filtroMetodo === 'todos'
    ? TRANSACCIONES
    : TRANSACCIONES.filter((t) => t.metodo.toLowerCase() === filtroMetodo);

  return (
    <motion.div className="row g-3" variants={container} initial="hidden" animate="show">
      {/* Resumen del turno */}
      <div className="col-12 col-lg-4">
        <motion.div variants={item}>
          <Card className="h-100">
            <h5 className="mb-3">Turno Actual</h5>
            <div className="mb-3">
              <div className="text-muted small">Turno</div>
              <div className="fw-semibold">Mañana</div>
            </div>
            <div className="mb-3">
              <div className="text-muted small">Apertura</div>
              <div className="fw-semibold">09:00</div>
            </div>
            <div className="mb-3">
              <div className="text-muted small">Cajero</div>
              <div className="fw-semibold">María González</div>
            </div>

            <hr />

            <div className="row g-2 mb-3">
              <div className="col-6">
                <div className="text-muted small">Ventas</div>
                <div className="fw-bold fs-5">$856.00</div>
              </div>
              <div className="col-6">
                <div className="text-muted small">Transacciones</div>
                <div className="fw-bold fs-5">34</div>
              </div>
              <div className="col-6">
                <div className="text-muted small">Ticket promedio</div>
                <div className="fw-bold">$25.18</div>
              </div>
              <div className="col-6">
                <div className="text-muted small">Efectivo en caja</div>
                <div className="fw-bold">$1,250.00</div>
              </div>
            </div>

            <div className="d-flex align-center gap-2 p-2 rounded mb-3" style={{ background: '#ECFDF5' }}>
              <i className="bi bi-check-circle text-success"></i>
              <div>
                <div className="fw-semibold small text-success">Diferencia de arqueo</div>
                <div className="fw-bold text-success">+$12.00</div>
              </div>
            </div>

            <div className="d-grid gap-2">
              <Button variant="primary" icon="bi-lock">Cerrar Turno</Button>
              <Button variant="secondary">Arqueo Parcial</Button>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Transacciones */}
      <div className="col-12 col-lg-8">
        <motion.div variants={item}>
          <Card className="h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">Transacciones del Turno</h5>
              <div className="d-flex gap-2">
                {['todos', 'efectivo', 'tarjeta', 'transferencia'].map((m) => (
                  <button
                    key={m}
                    className={`btn btn-sm ${filtroMetodo === m ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => setFiltroMetodo(m)}
                  >
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Hora</th>
                    <th>Monto</th>
                    <th>Método</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {transaccionesFiltradas.map((t) => (
                    <tr key={t.id}>
                      <td className="fw-semibold">{t.id}</td>
                      <td className="text-muted">{t.hora}</td>
                      <td className="fw-semibold">{formatCurrency(t.monto)}</td>
                      <td className="text-muted">{t.metodo}</td>
                      <td>
                        <Badge variant={ESTADOS[t.estado].variante}>
                          {ESTADOS[t.estado].nombre}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="d-flex justify-content-between align-items-center mt-3">
              <span className="text-muted small">Mostrando {transaccionesFiltradas.length} de {TRANSACCIONES.length}</span>
              <span className="fw-bold">Total: $856.00</span>
            </div>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 2: Verificar que la app compila**

```bash
cd pos/frontend
npm run build
```

Expected: Build exitoso

- [ ] **Step 3: Commit**

```bash
git add pos/frontend/src/pages/caja/CajaPage.jsx
git commit -m "feat: update CajaPage with new design"
```

---

### Task 14: Actualizar MesasPage con nuevo diseño

**Files:**
- Modify: `pos/frontend/src/pages/mesas/MesasPage.jsx`

**Interfaces:**
- Consumes: `Card`, `Badge`, `Button`
- Produces: Mesas con grid de mesas + panel de detalles

- [ ] **Step 1: Reemplazar MesasPage.jsx**

```jsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';

const MESAS = [
  { id: 1, numero: 'Mesa 01', estado: 'libre', capacidad: 2, ocupados: 0, tiempo: null },
  { id: 2, numero: 'Mesa 02', estado: 'ocupada', capacidad: 4, ocupados: 3, tiempo: '25 min' },
  { id: 3, numero: 'Mesa 03', estado: 'libre', capacidad: 4, ocupados: 0, tiempo: null },
  { id: 4, numero: 'Mesa 04', estado: 'ocupada', capacidad: 4, ocupados: 4, tiempo: '45 min' },
  { id: 5, numero: 'Mesa 05', estado: 'reservada', capacidad: 6, ocupados: 0, tiempo: null },
  { id: 6, numero: 'Mesa 06', estado: 'ocupada', capacidad: 2, ocupados: 2, tiempo: '15 min' },
  { id: 7, numero: 'Mesa 07', estado: 'libre', capacidad: 4, ocupados: 0, tiempo: null },
  { id: 8, numero: 'Mesa 08', estado: 'ocupada', capacidad: 4, ocupados: 2, tiempo: '30 min' },
];

const ESTADOS_MESA = {
  libre: { nombre: 'Libre', variante: 'success' },
  ocupada: { nombre: 'Ocupada', variante: 'danger' },
  reservada: { nombre: 'Reservada', variante: 'warning' },
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function MesasPage() {
  const [filtro, setFiltro] = useState('todas');
  const [mesaSeleccionada, setMesaSeleccionada] = useState(MESAS[3]);

  const mesasFiltradas = filtro === 'todas'
    ? MESAS
    : MESAS.filter((m) => m.estado === filtro);

  return (
    <div className="row g-3">
      {/* Grid de mesas */}
      <div className="col-12 col-lg-8">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="d-flex gap-2">
            {['todas', 'libre', 'ocupada', 'reservada'].map((f) => (
              <button
                key={f}
                className={`btn btn-sm ${filtro === f ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setFiltro(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <Button variant="primary" icon="bi-plus-lg">Nueva Mesa</Button>
        </div>

        <motion.div className="row g-3" variants={container} initial="hidden" animate="show">
          {mesasFiltradas.map((m) => (
            <div key={m.id} className="col-6 col-md-4 col-xl-3">
              <motion.div variants={item}>
                <Card
                  className={`h-100 ${mesaSeleccionada?.id === m.id ? 'border-primary' : ''}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setMesaSeleccionada(m)}
                >
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <h6 className="mb-0" style={{ fontFamily: 'Newsreader, serif' }}>
                      {m.numero}
                    </h6>
                    <Badge variant={ESTADOS_MESA[m.estado].variante}>
                      {ESTADOS_MESA[m.estado].nombre}
                    </Badge>
                  </div>
                  <div className="text-muted small mb-1">
                    {m.ocupados}/{m.capacidad} personas
                  </div>
                  {m.tiempo && (
                    <div className="text-muted small">
                      <i className="bi bi-clock me-1"></i>
                      {m.tiempo}
                    </div>
                  )}
                </Card>
              </motion.div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Detalle de mesa */}
      <div className="col-12 col-lg-4">
        {mesaSeleccionada && (
          <Card className="sticky-top" style={{ top: '80px' }}>
            <h5 className="mb-3">{mesaSeleccionada.numero}</h5>

            <div className="mb-3">
              <div className="text-muted small">Ubicación</div>
              <div className="fw-semibold">Salón Principal</div>
            </div>
            <div className="mb-3">
              <div className="text-muted small">Capacidad</div>
              <div className="fw-semibold">{mesaSeleccionada.capacidad} personas</div>
            </div>
            <div className="mb-3">
              <div className="text-muted small">Mesero</div>
              <div className="fw-semibold">Carlos Barista</div>
            </div>

            <hr />

            <h6 className="mb-2">Pedidos activos</h6>
            <div className="d-flex flex-column gap-2 mb-3">
              <div className="d-flex justify-content-between align-items-center p-2 rounded" style={{ background: '#F5F0EB' }}>
                <div>
                  <div className="fw-semibold small">#1042</div>
                  <div className="text-muted small">2x Copa Vainilla, 1x Café Latte</div>
                </div>
                <div className="fw-semibold">$18.50</div>
              </div>
            </div>

            <div className="d-flex justify-content-between mb-3">
              <span className="text-muted">Total consumido</span>
              <span className="fw-bold fs-5">$18.50</span>
            </div>

            <div className="d-grid gap-2">
              <Button variant="secondary" icon="bi-person">Asignar Mesero</Button>
              <Button variant="danger" icon="bi-x-lg">Liberar Mesa</Button>
              <Button variant="primary" icon="bi-arrow-left-right">Transferir</Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar que la app compila**

```bash
cd pos/frontend
npm run build
```

Expected: Build exitoso

- [ ] **Step 3: Commit**

```bash
git add pos/frontend/src/pages/mesas/MesasPage.jsx
git commit -m "feat: update MesasPage with new design"
```

---

### Task 15: Actualizar LoginPage con nuevo tema

**Files:**
- Modify: `pos/frontend/src/pages/auth/LoginPage.jsx`

**Interfaces:**
- Consumes: `Button`, `Input`, `Card`
- Produces: Login con tema Helados Pariente

- [ ] **Step 1: Reemplazar LoginPage.jsx**

```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError('Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="auth-card">
          <h1>Helados Pariente</h1>
          <p className="text-muted text-center mb-4">Sistema de Punto de Venta</p>

          <form onSubmit={handleSubmit}>
            <Input
              type="email"
              label="Email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              label="Contraseña"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && (
              <div className="alert alert-danger py-2" role="alert">
                {error}
              </div>
            )}

            <Button type="submit" variant="primary" size="lg" className="w-100" disabled={loading}>
              {loading ? 'Ingresando...' : 'Ingresar'}
            </Button>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar que la app compila**

```bash
cd pos/frontend
npm run build
```

Expected: Build exitoso

- [ ] **Step 3: Commit**

```bash
git add pos/frontend/src/pages/auth/LoginPage.jsx
git commit -m "feat: update LoginPage with Helados Pariente theme"
```

---

### Task 16: Verificación final y pruebas

**Files:**
- Todos los archivos modificados

**Interfaces:**
- Consumes: todo lo anterior
- Produces: App compilando y funcionando correctamente

- [ ] **Step 1: Ejecutar build de producción**

```bash
cd pos/frontend
npm run build
```

Expected: Build exitoso sin errores

- [ ] **Step 2: Ejecutar tests**

```bash
cd pos/frontend
npm run test
```

Expected: Tests pasan (o no hay tests para los nuevos componentes)

- [ ] **Step 3: Verificar que el dev server arranca**

```bash
cd pos/frontend
npm run dev
```

Expected: Dev server arranca en http://localhost:5173

- [ ] **Step 4: Verificar visualmente las pantallas**

- Dashboard: métricas, gráfico, pedidos, alertas
- Ventas: catálogo, categorías, ticket, botones de pago
- Caja: resumen turno, transacciones, filtros
- Mesas: grid mesas, detalle, botones de acción
- Login: tema Helados Pariente

- [ ] **Step 5: Commit final si hay cambios**

```bash
git add -A
git commit -m "feat: complete POS visual redesign with Bootstrap 5 and Framer Motion"
```

---

## Resumen de Tasks

| Task | Descripción | Archivos |
|---|---|---|
| 1 | Instalar dependencias y fuentes | package.json, index.html, main.jsx |
| 2 | Crear tokens.css | styles/tokens.css |
| 3 | Crear bootstrap-theme.css | styles/bootstrap-theme.css |
| 4 | Componentes UI base | Button.jsx, Card.jsx, Badge.jsx |
| 5 | Componentes UI avanzados | Input.jsx, Modal.jsx, DataTable.jsx |
| 6 | Componentes UI complementarios | Alert.jsx, Skeleton.jsx, EmptyState.jsx, Avatar.jsx |
| 7 | Sidebar con Bootstrap Icons | Sidebar.jsx, app.css |
| 8 | Header y MainLayout | Header.jsx, MainLayout.jsx |
| 9 | AnimatePresence en rutas | AppRoutes.jsx |
| 10 | Utils | format.js, constants.js |
| 11 | DashboardPage | DashboardPage.jsx |
| 12 | VentasPage | VentasPage.jsx |
| 13 | CajaPage | CajaPage.jsx |
| 14 | MesasPage | MesasPage.jsx |
| 15 | LoginPage | LoginPage.jsx |
| 16 | Verificación final | todos |
