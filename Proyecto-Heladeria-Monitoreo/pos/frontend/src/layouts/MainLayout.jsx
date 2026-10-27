import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';
import { formatearHoyBolivia } from '../utils/format.js';

const TITULOS = {
  '/dashboard': { title: 'Panel Principal', breadcrumb: null },
  '/ventas': { title: 'Punto de Venta', breadcrumb: 'Nueva venta' },
  '/ventas/historial': { title: 'Historial de Ventas', breadcrumb: 'Ventas' },
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
  '/reportes': { title: 'Reportes', breadcrumb: 'Cierre' },
  '/pagos': { title: 'Métodos de Pago', breadcrumb: 'Catálogo' },
  '/usuarios': { title: 'Usuarios', breadcrumb: 'Sistema' },
};

export default function MainLayout() {
  const location = useLocation();
  const [override, setOverride] = useState(null);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const hoyBo = useMemo(() => formatearHoyBolivia(), []);
  const base = TITULOS[location.pathname] || { title: 'Helados Pariente', breadcrumb: '' };
  const resuelto = { ...base };
  if (location.pathname === '/dashboard' && !resuelto.breadcrumb) resuelto.breadcrumb = hoyBo;
  const { title, breadcrumb } = { ...resuelto, ...(override || {}) };

  // En móvil el menú es un drawer: se cierra al navegar.
  useEffect(() => { setMenuAbierto(false); }, [location.pathname]);

  // Cierra con Escape.
  useEffect(() => {
    if (!menuAbierto) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setMenuAbierto(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuAbierto]);

  return (
    <div className="layout">
      <Sidebar abierto={menuAbierto} onCerrar={() => setMenuAbierto(false)} />
      {menuAbierto && (
        <div
          className="sidebar-backdrop"
          aria-hidden="true"
          onClick={() => setMenuAbierto(false)}
        />
      )}
      <div className="content">
        <Header
          title={title}
          breadcrumb={breadcrumb}
          onMenu={() => setMenuAbierto(true)}
          menuAbierto={menuAbierto}
        />
        <main className="main-content">
          <Outlet context={{ setHeaderOverride: setOverride }} />
        </main>
      </div>
    </div>
  );
}
