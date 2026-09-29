import { usePermisos } from '../../context/PermisosContext.jsx';

export default function RequirePermiso({ permiso, children, fallback = null }) {
  const { tienePermiso } = usePermisos();
  if (!tienePermiso(permiso)) return fallback;
  return children;
}
