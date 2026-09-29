import { createClient } from '@supabase/supabase-js';

// Cliente único. Solo claves publishable (nunca service-role en React).
// Sin .env la app quedaba en blanco: fallamos con mensaje claro en su lugar.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Falta frontend/.env (VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY). Cópialo de .env.example y reinicia `npm run dev`.');
}
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
