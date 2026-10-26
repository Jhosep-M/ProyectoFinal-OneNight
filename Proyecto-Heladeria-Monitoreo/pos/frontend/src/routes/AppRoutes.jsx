import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import MainLayout from '../layouts/MainLayout.jsx';
import AuthLayout from '../layouts/AuthLayout.jsx';
import RequireAuth from '../components/common/RequireAuth.jsx';
import RequirePermiso from '../components/common/RequirePermiso.jsx';
import LoginPage from '../pages/auth/LoginPage.jsx';
import RecuperarPage from '../pages/auth/Recuperar.jsx';
import DashboardPage from '../pages/dashboard/DashboardPage.jsx';
import VentasPage from '../pages/ventas/VentasPage.jsx';
import HistorialVentas from '../pages/ventas/HistorialVentas.jsx';
import DevolucionesPage from '../pages/Devoluciones.jsx';
import CajaPage from '../pages/caja/CajaPage.jsx';
import PedidosPage from '../pages/pedidos/PedidosPage.jsx';
import MesasPage from '../pages/mesas/MesasPage.jsx';
import ProductosPage, { Categorias as CategoriasPage } from '../pages/catalogo/Productos.jsx';
import InventarioPage from '../pages/catalogo/Inventario.jsx';
import ProveedoresPage from '../pages/catalogo/Proveedores.jsx';
import RecetasPage from '../pages/catalogo/RecetasPage.jsx';
import ClientesPage from '../pages/clientes/ClientesPage.jsx';
import PromocionesPage from '../pages/promociones/PromocionesPage.jsx';
import UsuariosPage from '../pages/usuarios/UsuariosPage.jsx';
import AuditoriaPage from '../pages/auditoria/AuditoriaPage.jsx';
import ReportesPage from '../pages/reportes/Reportes.jsx';
import PagosPage from '../pages/pagos/Pagos.jsx';
import IntegracionPage from '../pages/integracion/IntegracionPage.jsx';
import TurnosAdminPage from '../pages/admin/TurnosAdminPage.jsx';
import MeseroPage from '../pages/mesero/MeseroPage.jsx';
import CocinaPage from '../pages/cocina/CocinaPage.jsx';

export default function AppRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/recuperar" element={<RecuperarPage />} />
        </Route>

        <Route element={<RequireAuth><MainLayout /></RequireAuth>}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/ventas" element={<RequirePermiso permiso="venta.consultar"><VentasPage /></RequirePermiso>} />
          <Route path="/ventas/historial" element={<RequirePermiso permiso="venta.consultar"><HistorialVentas /></RequirePermiso>} />
          <Route path="/devoluciones" element={<RequirePermiso permiso="devolucion.consultar"><DevolucionesPage /></RequirePermiso>} />
          <Route path="/caja" element={<RequirePermiso permiso="turno.consultar"><CajaPage /></RequirePermiso>} />
          <Route path="/admin/turnos" element={<RequirePermiso permiso="turno.consultar.todos"><TurnosAdminPage /></RequirePermiso>} />
          <Route path="/pedidos" element={<RequirePermiso permiso="pedido.consultar"><PedidosPage /></RequirePermiso>} />
          <Route path="/mesero" element={<RequirePermiso permiso="pedido.consultar"><MeseroPage /></RequirePermiso>} />
          <Route path="/cocina" element={<RequirePermiso permiso="pedido.estado"><CocinaPage /></RequirePermiso>} />
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
          <Route path="/reportes" element={<RequirePermiso permiso="venta.consultar"><ReportesPage /></RequirePermiso>} />
          <Route path="/pagos" element={<RequirePermiso permiso="pago.gestionar"><PagosPage /></RequirePermiso>} />
          <Route path="/usuarios" element={<RequirePermiso permiso="usuario.gestionar"><UsuariosPage /></RequirePermiso>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}
