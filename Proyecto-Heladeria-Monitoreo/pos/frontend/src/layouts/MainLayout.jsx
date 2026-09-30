import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';

const TITULOS = {
  '/dashboard': { title: 'Panel Principal', breadcrumb: 'Hoy, 28 sept 2026' },
  '/ventas': { title: 'Punto de Venta', breadcrumb: 'Nueva venta' },
  '/caja': { title: 'Caja / Turno Actual', breadcrumb: 'Turno Mañana' },
  '/pedidos': { title: 'Pedidos', breadcrumb: 'Gestión de pedidos' },
  '/mesas': { title: 'Gestión de Salón y Mesas', breadcrumb: 'Cargando mesas…' },
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
  const [override, setOverride] = useState(null);
  const base = TITULOS[location.pathname] || { title: 'Helados Pariente', breadcrumb: '' };
  const { title, breadcrumb } = { ...base, ...(override || {}) };

  return (
    <div className="layout">
      <Sidebar />
      <div className="content">
        <Header title={title} breadcrumb={breadcrumb} />
        <main className="main-content">
          <Outlet context={{ setHeaderOverride: setOverride }} />
        </main>
      </div>
    </div>
  );
}
