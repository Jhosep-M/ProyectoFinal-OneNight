<<<<<<< HEAD
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { PermisosProvider } from './context/PermisosContext.jsx';
=======
import { AuthProvider } from './context/AuthContext.jsx';
>>>>>>> origin/feature/Airton-auxilio
import AppRoutes from './routes/AppRoutes.jsx';

export default function App() {
  return (
<<<<<<< HEAD
    <BrowserRouter>
      <AuthProvider>
        <PermisosProvider>
          <AppRoutes />
        </PermisosProvider>
      </AuthProvider>
    </BrowserRouter>
=======
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
>>>>>>> origin/feature/Airton-auxilio
  );
}
