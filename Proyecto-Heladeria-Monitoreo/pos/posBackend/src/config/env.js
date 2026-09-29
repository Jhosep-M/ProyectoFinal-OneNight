require('dotenv').config();

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

const env = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  databaseUrl: process.env.DATABASE_URL || '',
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map(s => s.trim()),
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  monitoreoUrl: process.env.MONITOREO_URL || '',
  monitoreoApiKey: process.env.MONITOREO_API_KEY || '',
  posAlertApiKey: process.env.POS_ALERT_API_KEY || '',
  organizacionExternaId: process.env.ORGANIZACION_EXTERNA_ID || '',
};

function assertEnvForStart() {
  if (env.nodeEnv === 'production') {
    requireEnv('SUPABASE_URL');
    requireEnv('DATABASE_URL');
  }
}

module.exports = { env, assertEnvForStart };
