import { createClient } from '@supabase/supabase-js';

// Cliente único. Solo claves publishable (nunca service-role en React).
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL ?? '',
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
);
