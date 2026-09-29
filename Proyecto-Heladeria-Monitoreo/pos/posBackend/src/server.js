const { createApp } = require('./app');
const { env, assertEnvForStart } = require('./config/env');
const { sequelize } = require('./config/database');
const { startWorker } = require('./jobs/colaWorker');

async function main() {
  assertEnvForStart();
  if (env.databaseUrl) {
    try { await sequelize.authenticate(); console.log('DB connected'); } catch (e) { console.warn('DB not connected (scaffold mode)', e.message); }
  } else {
    console.warn('DATABASE_URL not set — running without DB');
  }
  const app = createApp();
  app.listen(env.port, () => {
    console.log(`POS backend listening on :${env.port} [${env.nodeEnv}]`);
  });
  if (env.databaseUrl && process.env.MONITOREO_URL) startWorker();
}

main().catch(e => { console.error(e); process.exit(1); });
