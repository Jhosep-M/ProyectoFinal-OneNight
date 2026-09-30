import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

// Protege rutas privadas: sin sesión redirige a /login.
// Sin este guard, cerrar sesión limpiaba el token pero el usuario
// seguía viendo la página actual y parecía que "Salir no funciona".
export default function RequireAuth({ children }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="auth-wrap"><p>Cargando sesión…</p></div>;
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children ?? <Outlet />;
}
