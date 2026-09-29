import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import MainLayout from '../layouts/MainLayout';
import Login from '../views/Login';
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

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Navigate to="/consumo" replace />} />
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
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
