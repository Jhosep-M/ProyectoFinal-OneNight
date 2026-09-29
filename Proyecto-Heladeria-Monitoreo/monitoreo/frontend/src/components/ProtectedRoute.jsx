import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute() {
  const { sesion, cargando } = useAuth();
  if (cargando) return <p className="cargando">Cargando…</p>;
  if (!sesion) return <Navigate to="/login" replace />;
  return <Outlet />;
}
