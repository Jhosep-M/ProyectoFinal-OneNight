import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiFetch } from '../services/api.js';

const PermisosCtx = createContext(null);

export function PermisosProvider({ children }) {
  const [permisos, setPermisos] = useState([]);
  const [loading, setLoading] = useState(true);

  const recargar = useCallback(async () => {
    try {
      const r = await apiFetch('/me/permissions');
      setPermisos(r.permisos || []);
    } catch {
      setPermisos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { recargar(); }, [recargar]);

  const tienePermiso = useCallback(
    (permiso) => permisos.includes(permiso),
    [permisos]
  );

  return (
    <PermisosCtx.Provider value={{ permisos, loading, tienePermiso, recargar }}>
      {children}
    </PermisosCtx.Provider>
  );
}

export function usePermisos() {
  return useContext(PermisosCtx);
}
