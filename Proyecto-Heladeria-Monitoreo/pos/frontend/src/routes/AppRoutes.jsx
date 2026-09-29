<<<<<<< HEAD
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import MainLayout from '../layouts/MainLayout.jsx';
import AuthLayout from '../layouts/AuthLayout.jsx';
import RequirePermiso from '../components/common/RequirePermiso.jsx';
import LoginPage from '../pages/auth/LoginPage.jsx';
import DashboardPage from '../pages/dashboard/DashboardPage.jsx';
=======
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import LoginPage from '../pages/auth/LoginPage.jsx';
>>>>>>> origin/feature/Airton-auxilio
import VentasPage from '../pages/ventas/VentasPage.jsx';
import CajaPage from '../pages/caja/CajaPage.jsx';
import PedidosPage from '../pages/pedidos/PedidosPage.jsx';
import MesasPage from '../pages/mesas/MesasPage.jsx';
<<<<<<< HEAD
import ProductosPage from '../pages/catalogo/Productos.jsx';
import InventarioPage from '../pages/catalogo/Inventario.jsx';
import { Recetas as RecetasPage } from '../pages/catalogo/RecetasClientesPromos.jsx';
import ClientesPage from '../pages/clientes/ClientesPage.jsx';
import PromocionesPage from '../pages/promociones/PromocionesPage.jsx';
import UsuariosPage from '../pages/usuarios/UsuariosPage.jsx';
import AuditoriaPage from '../pages/auditoria/AuditoriaPage.jsx';
import IntegracionPage from '../pages/integracion/IntegracionPage.jsx';

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
=======

function Protegida({ children }) {
  const { session, loading } = useAuth();
  if (loading) return <p>Cargando sesión…</p>;
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

function Shell({ children }) {
  const { session, signOut } = useAuth();
  return (
    <div className="shell">
      <nav className="nav">
        <strong>POS Heladería</strong>
        <Link to="/ventas">Ventas</Link>
        <Link to="/caja">Caja</Link>
        <Link to="/pedidos">Pedidos</Link>
        <Link to="/mesas">Mesas</Link>
        <span className="user">{session?.user?.email}</span>
        <button onClick={signOut}>Salir</button>
      </nav>
      <main>{children}</main>
    </div>
  );
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/ventas" element={<Protegida><Shell><VentasPage /></Shell></Protegida>} />
        <Route path="/caja" element={<Protegida><Shell><CajaPage /></Shell></Protegida>} />
        <Route path="/pedidos" element={<Protegida><Shell><PedidosPage /></Shell></Protegida>} />
        <Route path="/mesas" element={<Protegida><Shell><MesasPage /></Shell></Protegida>} />
        <Route path="*" element={<Navigate to="/ventas" replace />} />
      </Routes>
    </BrowserRouter>
>>>>>>> origin/feature/Airton-auxilio
  );
}
