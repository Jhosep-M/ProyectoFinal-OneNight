'use strict';

const { createClient } = require('@supabase/supabase-js');
const { env } = require('../config/env');

// SEGURIDAD: la identidad autenticada se deriva EXCLUSIVAMENTE del JWT
// validado contra Supabase Auth. NUNCA aceptar userId (ni usuario_id,
// id_usuario, etc.) proveniente del body, query params o headers para
// identificar al usuario: todo ID de usuario debe salir de req.user,
// poblado aquí desde el token verificado.
async function authenticateJWT(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = header.slice(7).trim();
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    return res.status(500).json({ error: 'Auth misconfigured' });
  }
  try {
    const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data, error } = await supabase.auth.getUser(token);
    const user = data && data.user;
    // [TEMP-DEBUG] diagnóstico 401 en Render — REVERTIR.
    if (error || !user) {
      const dbg = {
        url: env.supabaseUrl,
        keyHead: (env.supabaseAnonKey || '').slice(0, 24),
        keyLen: (env.supabaseAnonKey || '').length,
        err: error ? { message: error.message, status: error.status, code: error.code } : null,
      };
      console.error('[AUTHDBG]', JSON.stringify(dbg));
      return res.status(401).json({ error: 'Unauthorized', debug: dbg });
    }
    // Solo datos del JWT verificado.
    req.user = { id: user.id, email: user.email };
    return next();
  } catch (e) {
    // Sin fugas: no devolver e.message ni stack al cliente.
    console.error('[AUTHDBG-CATCH]', e.message);
    return res.status(401).json({ error: 'Unauthorized', debug: 'catch:' + e.message });
  }
}

module.exports = { authenticateJWT, authenticate: authenticateJWT };
