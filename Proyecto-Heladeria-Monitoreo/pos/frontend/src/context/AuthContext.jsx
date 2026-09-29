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

  return (
    <AuthCtx.Provider value={{ session, loading, signIn, signOut }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
