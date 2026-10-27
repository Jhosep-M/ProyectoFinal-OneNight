import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiFetch } from '../services/api.js';
import { useAuth } from './AuthContext.jsx';

const PermisosCtx = createContext(null);

// Cache 5min por token: evita GET /me/permissions en cada remontaje.
// Era una fuente constante de 429 junto a /me/rol.
const PERMISOS_TTL_MS = 5 * 60 * 1000;
let permisosCache = { token: null, data: [], ts: 0 };

export function PermisosProvider({ children }) {
  const { session, loading: authLoading } = useAuth();
  const [permisos, setPermisos] = useState([]);
  const [loading, setLoading] = useState(true);

  const recargar = useCallback(async ({ force = false } = {}) => {
    // Sin sesión aún (login en curso o logged out): no pedir permisos sin JWT.
    if (!session?.access_token) {
      setPermisos([]);
      setLoading(false);
      return;
    }
    const token = session.access_token;
    if (
      !force &&
      permisosCache.token === token &&
      Date.now() - permisosCache.ts < PERMISOS_TTL_MS &&
      permisosCache.data.length > 0
    ) {
      setPermisos(permisosCache.data);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const r = await apiFetch('/me/permissions');
      const lista = r.permisos || [];
      permisosCache = { token, data: lista, ts: Date.now() };
      setPermisos(lista);
    } catch {
      setPermisos([]);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  // Recargar cada vez que cambie la sesión (login/logout/refresh).
  // Antes se llamaba una sola vez al montar, normalmente sin token,
  // lo que dejaba permisos=[] y ocultaba todo el menú excepto Dashboard.
  useEffect(() => {
    if (authLoading) return;
    recargar();
  }, [authLoading, recargar]);

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
  // Default defensivo: fuera del provider (ej. tests) no debe reventar.
  return (
    useContext(PermisosCtx) ?? {
      permisos: [],
      loading: false,
      tienePermiso: () => false,
      recargar: async () => {},
    }
  );
}
