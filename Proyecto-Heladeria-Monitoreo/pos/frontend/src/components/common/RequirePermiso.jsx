import { usePermisos } from '../../context/PermisosContext.jsx';

export default function RequirePermiso({ permiso, children, fallback = null }) {
  const { tienePermiso, loading } = usePermisos();
  if (loading) return null;
  if (!tienePermiso(permiso)) {
    // Si el caller da fallback explícito (ej. ocultar botón), respetarlo.
    // Si no, mostrar mensaje en vez de página en blanco.
    if (fallback !== null) return fallback;
    return (
      <div className="alert alert-warning d-flex align-items-center gap-2" role="alert">
        <i className="bi bi-shield-lock-fill"></i>
        <span>No tienes permiso para ver esta sección ({permiso}).</span>
      </div>
    );
  }
  return children;
}
