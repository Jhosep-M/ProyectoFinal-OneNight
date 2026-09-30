import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { PermisosProvider } from './context/PermisosContext.jsx';
import AppRoutes from './routes/AppRoutes.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PermisosProvider>
          <AppRoutes />
        </PermisosProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
