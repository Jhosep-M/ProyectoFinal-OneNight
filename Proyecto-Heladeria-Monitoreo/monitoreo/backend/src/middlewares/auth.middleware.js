const { createClient } = require('@supabase/supabase-js');
const { env } = require('../config/environment');

async function authenticateJWT(req, res, next) {
  // Identidad ya inyectada por middleware interno o testApp (nunca proviene del
  // cliente): únicamente src/app.js y tests/helpers/testApp.js setean req.user.
  if (req.user?.id) return next();
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Bearer token' });
  }
  const token = header.slice(7);
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }
  try {
    const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'Invalid token', detail: error?.message });
    req.user = { id: user.id, email: user.email };
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Auth failed', detail: e.message });
  }
}

module.exports = { authenticateJWT };
