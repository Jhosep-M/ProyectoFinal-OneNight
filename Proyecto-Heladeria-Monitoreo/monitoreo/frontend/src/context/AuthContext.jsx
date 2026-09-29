import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authService from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [sesion, setSesion] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [orgSeleccionada, setOrgSeleccionada] = useState(null);
  const [cargando, setCargando] = useState(true);

  const cargarPerfil = useCallback(async (sesionActual) => {
    if (!sesionActual) { setPerfil(null); setOrgSeleccionada(null); return; }
    try {
      const p = await authService.obtenerPerfil();
      setPerfil(p);
      setOrgSeleccionada((prev) => prev ?? p.organizaciones[0]?.id ?? null);
    } catch {
      setPerfil(null);
    }
  }, []);

  useEffect(() => {
    let vivo = true;
    const sub = authService.observarSesion(async (s) => {
      if (!vivo) return;
      setSesion(s);
      await cargarPerfil(s);
      if (vivo) setCargando(false);
    });
    return () => { vivo = false; sub.unsubscribe(); };
  }, [cargarPerfil]);

  const valor = useMemo(() => ({
    sesion,
    perfil,
    orgSeleccionada,
    setOrgSeleccionada,
    cargando,
    iniciarSesion: async (email, password) => {
      await authService.iniciarSesion(email, password); // onAuthStateChange actualiza el estado
    },
    cerrarSesion: () => authService.cerrarSesion(),
  }), [sesion, perfil, orgSeleccionada, cargando]);

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth fuera de AuthProvider');
  return ctx;
}
