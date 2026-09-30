import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { usePermisos } from '../context/PermisosContext.jsx';

const GRUPOS = [
  {
    titulo: 'Operación',
    enlaces: [
      { to: '/dashboard', texto: 'Dashboard', icono: 'bi-grid', permiso: null },
      { to: '/ventas', texto: 'Ventas', icono: 'bi-cart', permiso: 'venta.consultar' },
      { to: '/devoluciones', texto: 'Devoluciones', icono: 'bi-arrow-counterclockwise', permiso: 'devolucion.consultar' },
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
      { to: '/catalogo/proveedores', texto: 'Proveedores', icono: 'bi-truck', permiso: 'inventario.consultar' },
      { to: '/catalogo/recetas', texto: 'Recetas', icono: 'bi-journal-text', permiso: 'producto.consultar' },
      { to: '/catalogo/clientes', texto: 'Clientes', icono: 'bi-people', permiso: 'cliente.consultar' },
      { to: '/catalogo/promociones', texto: 'Promociones', icono: 'bi-tag', permiso: 'promocion.consultar' },
    ],
  },
  {
    titulo: 'Sistema',
    enlaces: [
      { to: '/admin/turnos', texto: 'Turnos', icono: 'bi-clock-history', permiso: 'turno.consultar.todos' },
      { to: '/integracion', texto: 'Integración', icono: 'bi-gear', permiso: 'integracion.consultar' },
      { to: '/auditoria', texto: 'Auditoría', icono: 'bi-shield', permiso: 'auditoria.consultar' },
      { to: '/usuarios', texto: 'Usuarios', icono: 'bi-person-gear', permiso: 'usuario.gestionar' },
    ],
  },
];

export default function Sidebar() {
  const { session, signOut } = useAuth();
  const { tienePermiso, loading } = usePermisos();
  const navigate = useNavigate();
  const [saliendo, setSaliendo] = useState(false);
  const [errorSalir, setErrorSalir] = useState('');

  const handleSalir = async () => {
    if (saliendo) return;
    setErrorSalir('');
    setSaliendo(true);
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch {
      setErrorSalir('No se pudo cerrar sesión. Intenta de nuevo.');
    } finally {
      setSaliendo(false);
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-name">Helados Pariente</span>
      </div>
      <nav className="sidebar-nav">
        {loading ? (
          <div className="sidebar-group">
            <div className="sidebar-group-title">Cargando permisos…</div>
          </div>
        ) : (
        GRUPOS.map((g) => (
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
        ))
        )}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="user-email">{session?.user?.email}</div>
          <button
            type="button"
            className="btn btn-sm btn-outline-light"
            onClick={handleSalir}
            disabled={saliendo}
          >
            <i className="bi bi-box-arrow-right me-1"></i>
            {saliendo ? 'Saliendo...' : 'Salir'}
          </button>
          {errorSalir && (
            <div className="text-danger small mt-1" role="alert">
              {errorSalir}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
