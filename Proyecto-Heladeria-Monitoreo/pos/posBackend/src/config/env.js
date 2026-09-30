require('dotenv').config();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

function envBool(value, fallback) {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function envInt(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
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
  monitoreoTimeoutMs: Number(process.env.MONITOREO_TIMEOUT_MS) > 0 ? Number(process.env.MONITOREO_TIMEOUT_MS) : 5000,
  posAlertApiKey: process.env.POS_ALERT_API_KEY || '',
  organizacionExternaId: process.env.ORGANIZACION_EXTERNA_ID || '',
  // Endurecimiento Fase C: timeouts de DB y verificación TLS.
  dbStatementTimeoutMs: envInt(process.env.DB_STATEMENT_TIMEOUT_MS, 15000),
  dbIdleInTransactionTimeoutMs: envInt(process.env.DB_IDLE_IN_TRANSACTION_TIMEOUT_MS, 30000),
  dbSslRejectUnauthorized: envBool(
    process.env.DB_SSL_REJECT_UNAUTHORIZED,
    process.env.NODE_ENV === 'production'
  ),
  httpTimeoutMs: envInt(process.env.HTTP_TIMEOUT_MS, 30000),
};

function assertEnvForStart() {
  // Lee process.env EN VIVO (no el snapshot `env`) para que el fail-fast
  // refleje el estado real del proceso al arrancar.
  if (process.env.NODE_ENV !== 'production') return;

  for (const name of [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'DATABASE_URL',
    'MONITOREO_URL',
    'MONITOREO_API_KEY',
    'ORGANIZACION_EXTERNA_ID',
  ]) {
    requireEnv(name);
  }

  const monitoreoUrl = process.env.MONITOREO_URL;
  if (!/^https:\/\//i.test(monitoreoUrl)) {
    throw new Error('MONITOREO_URL debe usar https en producción');
  }

  const orgId = process.env.ORGANIZACION_EXTERNA_ID;
  if (!UUID_RE.test(orgId)) {
    throw new Error('ORGANIZACION_EXTERNA_ID debe ser un uuid válido');
  }
}

module.exports = { env, assertEnvForStart };
