import { supabase } from './supabaseClient';
import { api } from './api';

export async function iniciarSesion(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data;
}

export async function cerrarSesion() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

export function observarSesion(callback) {
  const { data } = supabase.auth.onAuthStateChange((_evento, sesion) => callback(sesion));
  return data.subscription;
}

export async function obtenerPerfil() {
  return api.get('/auth/me');
}
