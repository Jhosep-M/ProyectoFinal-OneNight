import Card from '../../components/ui/Card.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import { usePermisos } from '../../context/PermisosContext.jsx';
import { useRol, inferirRolFallback } from '../../hooks/useRol.js';
import CajeroDashboard from './roles/CajeroDashboard.jsx';
import MeseroDashboard from './roles/MeseroDashboard.jsx';
import CocinaDashboard from './roles/CocinaDashboard.jsx';
import InventarioDashboard from './roles/InventarioDashboard.jsx';
import SupervisorDashboard from './roles/SupervisorDashboard.jsx';
import AdminDashboard from './roles/AdminDashboard.jsx';
import DashboardPage from './DashboardPage.jsx';

/**
 * Router de dashboards por rol (POS).
 * - Fuente de verdad del rol: GET /me/rol (JWT en backend).
 * - Fallback por permisos cuando el rol aún no llega o es 'cocinero'
 *   (permiso pedido.estado sin ventas/caja/inventario).
 * - 'admin' usa AdminDashboard detallado; el resto su panel operativo.
 * - Desconocido -> DashboardPage legacy para no dejar pantalla vacía.
 */
export default function DashboardRouter() {
  const { rol, loading: loadingRol } = useRol();
  const { tienePermiso, loading: loadingPermisos } = usePermisos();

  if (loadingRol || loadingPermisos) {
    return (
      <div className="d-flex flex-column gap-3" aria-label="Cargando panel">
        <div className="row g-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="col-12 col-md-6 col-xl-3">
              <Card className="h-100"><Skeleton height="80px" /></Card>
            </div>
          ))}
        </div>
        <Card><Skeleton height="220px" /></Card>
      </div>
    );
  }

  const efectivo = inferirRolFallback({ rol, tienePermiso }) || rol;

  switch ((efectivo || '').toLowerCase()) {
    case 'admin':
      return <AdminDashboard />;
    case 'supervisor':
      return <SupervisorDashboard />;
    case 'cajero':
      return <CajeroDashboard />;
    case 'mesero':
      return <MeseroDashboard />;
    case 'cocinero':
    case 'cocina':
      return <CocinaDashboard />;
    case 'inventario':
      return <InventarioDashboard />;
    default:
      // Sin rol claro: si solo puede cocina, manda a cocina; si no, legacy.
      if (typeof tienePermiso === 'function' && tienePermiso('pedido.estado')) {
        return <CocinaDashboard />;
      }
      return <DashboardPage />;
  }
}
