import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import MainLayout from '../layouts/MainLayout';
import Login from '../views/Login';
<<<<<<< HEAD
<<<<<<< HEAD
=======
import Dashboard from '../views/Dashboard';
>>>>>>> origin/feature/Airton-auxilio
=======
import Dashboard from '../views/Dashboard';
>>>>>>> develop
import Consumo from '../views/Consumo';
import Alertas from '../views/Alertas';
import Organizaciones from '../views/Organizaciones';
import Medidores from '../views/Medidores';
import Umbrales from '../views/Umbrales';
import Metas from '../views/Metas';
import Tarifas from '../views/Tarifas';
import Recomendaciones from '../views/Recomendaciones';
import Notificaciones from '../views/Notificaciones';
import Reportes from '../views/Reportes';
<<<<<<< HEAD
<<<<<<< HEAD
=======
import Auditoria from '../views/Auditoria';
>>>>>>> origin/feature/Airton-auxilio
=======
import Auditoria from '../views/Auditoria';
>>>>>>> develop

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
<<<<<<< HEAD
<<<<<<< HEAD
          <Route path="/" element={<Navigate to="/consumo" replace />} />
=======
          <Route path="/" element={<Dashboard />} />
>>>>>>> origin/feature/Airton-auxilio
=======
          <Route path="/" element={<Dashboard />} />
>>>>>>> develop
          <Route path="/consumo" element={<Consumo />} />
          <Route path="/alertas" element={<Alertas />} />
          <Route path="/organizaciones" element={<Organizaciones />} />
          <Route path="/medidores" element={<Medidores />} />
          <Route path="/umbrales" element={<Umbrales />} />
          <Route path="/metas" element={<Metas />} />
          <Route path="/tarifas" element={<Tarifas />} />
          <Route path="/recomendaciones" element={<Recomendaciones />} />
          <Route path="/notificaciones" element={<Notificaciones />} />
          <Route path="/reportes" element={<Reportes />} />
<<<<<<< HEAD
<<<<<<< HEAD
=======
          <Route path="/auditoria" element={<Auditoria />} />
>>>>>>> origin/feature/Airton-auxilio
=======
          <Route path="/auditoria" element={<Auditoria />} />
>>>>>>> develop
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
