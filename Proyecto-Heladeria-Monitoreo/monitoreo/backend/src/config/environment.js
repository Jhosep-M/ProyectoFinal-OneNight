require('dotenv').config({ quiet: true }); // quiet: sin banner "injected env" en la salida de tests

const env = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
  databaseUrl: process.env.DATABASE_URL || '',
  dbSchema: process.env.MONITOREO_DB_SCHEMA || 'monitoreo',
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5174').split(',').map((s) => s.trim()),
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  posAlertsUrl: process.env.POS_ALERTS_URL || '',
  posAlertsApiKey: process.env.POS_ALERTS_API_KEY || '',
  workerIntervalMs: parseInt(process.env.WORKER_INTERVAL_MS || '30000', 10),
  deliveryTimeoutMs: parseInt(process.env.DELIVERY_TIMEOUT_MS || '5000', 10),
  deliveryBackoffMinutes: parseInt(process.env.DELIVERY_BACKOFF_MINUTES || '5', 10),
  deliveryMaxIntentos: parseInt(process.env.DELIVERY_MAX_INTENTOS || '10', 10),
};

function assertEnvForStart() {
  const faltan = [];
  if (!env.supabaseUrl) faltan.push('SUPABASE_URL');
  if (!env.databaseUrl) faltan.push('DATABASE_URL');
  if (env.nodeEnv === 'production') {
    if (!env.posAlertsUrl) faltan.push('POS_ALERTS_URL');
    if (!env.posAlertsApiKey) faltan.push('POS_ALERTS_API_KEY');
  }
  if (faltan.length) throw new Error(`Missing env: ${faltan.join(', ')}`);
}

module.exports = { env, assertEnvForStart };
