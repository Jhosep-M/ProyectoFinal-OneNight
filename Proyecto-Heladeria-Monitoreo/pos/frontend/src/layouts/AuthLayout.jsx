import { Outlet } from 'react-router-dom';

// Layout de autenticación para React Router v6: las rutas hijas se renderizan
// vía <Outlet />. LoginPage ya trae su propio .auth-wrap/.auth-card, por eso
// aquí no se duplica el wrapper (antes usaba {children} y quedaba card vacía).
export default function AuthLayout() {
  return <Outlet />;
}
