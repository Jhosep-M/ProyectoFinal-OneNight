const { createApp } = require('./app');
const { env, assertEnvForStart } = require('./config/environment');
const { testConnection } = require('./config/database');
const { logger } = require('./utils/logger');

(async () => {
  try {
    assertEnvForStart();
    await testConnection();
    const app = createApp();
    const { start: startProcessing, stop: stopProcessing } = require('./jobs/processingWorker');
    const { start: startDelivery, stop: stopDelivery } = require('./jobs/alertDeliveryWorker');
    startProcessing();
    startDelivery();
    process.on('SIGINT', () => { stopProcessing(); stopDelivery(); process.exit(0); });
    process.on('SIGTERM', () => { stopProcessing(); stopDelivery(); process.exit(0); });
    app.listen(env.port, () => logger.info({ port: env.port }, 'monitoreo-backend listening'));
  } catch (e) {
    logger.error({ err: e.message }, 'fallo al iniciar');
    process.exit(1);
  }
})();
