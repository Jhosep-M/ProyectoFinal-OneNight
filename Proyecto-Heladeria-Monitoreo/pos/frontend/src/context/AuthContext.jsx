import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/api.js';

const AuthCtx = createContext(null);

// Autenticacion minima via Supabase Auth para obtener el JWT.
// El backend deriva el userId del token; el frontend nunca lo inventa.
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setSession(null);
  }, []);

  // HU-24 — Recuperar contraseña via Supabase Auth.
  // Mensaje genérico en UI; no revelar si el email existe.
  const resetPassword = useCallback(async (email) => {
    const clean = String(email || '').trim();
    if (!clean) throw new Error('Email requerido');
    const { error } = await supabase.auth.resetPasswordForEmail(clean, {
      redirectTo: `${window.location.origin}/login`,
    });
    if (error) throw error;
  }, []);

  // Cambio de contraseña con código de verificación (self-service, sin admin).
  // 1. solicitarCodigo(email): envía código de 6 dígitos al correo.
  // 2. verificarCodigo(email, codigo): canjea el código por una sesión de recovery.
  // 3. actualizarPassword(nueva): cambia la clave del usuario autenticado.
  const solicitarCodigo = useCallback(async (email) => {
    const clean = String(email || '').trim();
    if (!clean) throw new Error('Email requerido');
    // resetPasswordForEmail genera un OTP tipo recovery canjeable con verifyOtp.
    const { error } = await supabase.auth.resetPasswordForEmail(clean);
    if (error) throw error;
  }, []);

  const verificarCodigo = useCallback(async (email, codigo) => {
    const cleanEmail = String(email || '').trim();
    const token = String(codigo || '').trim();
    if (!cleanEmail || !token) throw new Error('Email y código requeridos');
    // Intento principal: OTP de recuperación.
    let { data, error } = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token,
      type: 'recovery',
    });
    // Fallback: algunos proyectos emiten el OTP como email/magiclink.
    if (error) {
      const segundo = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token,
        type: 'email',
      });
      data = segundo.data;
      error = segundo.error;
    }
    if (error) throw error;
    return data;
  }, []);

  const actualizarPassword = useCallback(async (nueva) => {
    const pwd = String(nueva || '');
    if (pwd.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres');
    const { error } = await supabase.auth.updateUser({ password: pwd });
    if (error) throw error;
  }, []);

  // Opción A: ownership en UI. El userId se deriva del JWT (sub), nunca se inventa.
  const userId = session?.user?.id || null;
  const email = session?.user?.email || null;

  return (
    <AuthCtx.Provider value={{ session, loading, signIn, signOut, resetPassword, solicitarCodigo, verificarCodigo, actualizarPassword, userId, user: session?.user || null, email }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
