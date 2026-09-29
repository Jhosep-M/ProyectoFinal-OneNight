import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import MainLayout from '../layouts/MainLayout.jsx';
import AuthLayout from '../layouts/AuthLayout.jsx';
import RequireAuth from '../components/common/RequireAuth.jsx';
import RequirePermiso from '../components/common/RequirePermiso.jsx';
import LoginPage from '../pages/auth/LoginPage.jsx';
import DashboardPage from '../pages/dashboard/DashboardPage.jsx';
import VentasPage from '../pages/ventas/VentasPage.jsx';
import CajaPage from '../pages/caja/CajaPage.jsx';
import PedidosPage from '../pages/pedidos/PedidosPage.jsx';
import MesasPage from '../pages/mesas/MesasPage.jsx';
import ProductosPage, { Categorias as CategoriasPage } from '../pages/catalogo/Productos.jsx';
import InventarioPage, { Proveedores as ProveedoresPage } from '../pages/catalogo/Inventario.jsx';
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

        <Route element={<RequireAuth><MainLayout /></RequireAuth>}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/ventas" element={<RequirePermiso permiso="venta.consultar"><VentasPage /></RequirePermiso>} />
          <Route path="/caja" element={<RequirePermiso permiso="turno.consultar"><CajaPage /></RequirePermiso>} />
          <Route path="/pedidos" element={<RequirePermiso permiso="pedido.consultar"><PedidosPage /></RequirePermiso>} />
          <Route path="/mesas" element={<RequirePermiso permiso="mesa.consultar"><MesasPage /></RequirePermiso>} />
          <Route path="/catalogo/productos" element={<RequirePermiso permiso="producto.consultar"><ProductosPage /></RequirePermiso>} />
          <Route path="/catalogo/categorias" element={<RequirePermiso permiso="producto.consultar"><CategoriasPage /></RequirePermiso>} />
          <Route path="/catalogo/inventario" element={<RequirePermiso permiso="inventario.consultar"><InventarioPage /></RequirePermiso>} />
          <Route path="/catalogo/proveedores" element={<RequirePermiso permiso="inventario.consultar"><ProveedoresPage /></RequirePermiso>} />
          <Route path="/catalogo/recetas" element={<RequirePermiso permiso="producto.consultar"><RecetasPage /></RequirePermiso>} />
          <Route path="/catalogo/clientes" element={<RequirePermiso permiso="cliente.consultar"><ClientesPage /></RequirePermiso>} />
          <Route path="/catalogo/promociones" element={<RequirePermiso permiso="promocion.consultar"><PromocionesPage /></RequirePermiso>} />
          <Route path="/integracion" element={<RequirePermiso permiso="integracion.consultar"><IntegracionPage /></RequirePermiso>} />
          <Route path="/auditoria" element={<RequirePermiso permiso="auditoria.consultar"><AuditoriaPage /></RequirePermiso>} />
          <Route path="/usuarios" element={<RequirePermiso permiso="usuario.gestionar"><UsuariosPage /></RequirePermiso>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}
