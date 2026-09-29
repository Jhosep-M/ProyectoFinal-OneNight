import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import LoginPage from '../pages/auth/LoginPage.jsx';
import VentasPage from '../pages/ventas/VentasPage.jsx';
import CajaPage from '../pages/caja/CajaPage.jsx';
import PedidosPage from '../pages/pedidos/PedidosPage.jsx';
import MesasPage from '../pages/mesas/MesasPage.jsx';

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
  );
}
