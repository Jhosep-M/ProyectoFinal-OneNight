const { createApp } = require('./app');
const { env, assertEnvForStart } = require('./config/env');
const { sequelize } = require('./config/database');
const { startWorker } = require('./jobs/colaWorker');

const HTTP_TIMEOUT_MS = 30000;

async function main() {
  assertEnvForStart();
  if (env.databaseUrl) {
    try { await sequelize.authenticate(); console.log('DB connected'); } catch (e) { console.warn('DB not connected (scaffold mode)', e.message); }
  } else {
    console.warn('DATABASE_URL not set — running without DB');
  }
  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`POS backend listening on :${env.port} [${env.nodeEnv}]`);
  });
  // Corta conexiones que excedan el timeout HTTP configurado.
  server.setTimeout(HTTP_TIMEOUT_MS, (socket) => socket.destroy());
  if (env.databaseUrl && process.env.MONITOREO_URL) startWorker();
}

if (require.main === module) {
  main().catch(e => { console.error(e); process.exit(1); });
}

module.exports = { main, HTTP_TIMEOUT_MS };
