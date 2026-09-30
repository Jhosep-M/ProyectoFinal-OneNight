const express = require('express');
const pinoHttp = require('pino-http');
const { env } = require('./config/environment');
const { logger } = require('./utils/logger');
const { securityHeaders, corsMiddleware } = require('./middlewares/security.middleware');
const { requestId } = require('./middlewares/requestId.middleware');
const { apiLimiter } = require('./middlewares/rateLimit.middleware');
const { notFound, errorHandler } = require('./middlewares/error.middleware');
const { healthRouter } = require('./routes/health.routes');

function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(requestId);
  app.use(securityHeaders);
  app.use(corsMiddleware);
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(pinoHttp({ logger, autoLogging: env.nodeEnv !== 'test' }));
  app.use('/api', apiLimiter);

  app.use('/health', healthRouter);
  const { authRouter } = require('./routes/auth.routes');
  app.use('/api/v1/auth', authRouter);

  const { organizacionesRouter } = require('./routes/organizaciones.routes');
  const { medidoresRouter } = require('./routes/medidores.routes');
  const { recursosRouter } = require('./routes/recursos.routes');
  const { usuariosRouter } = require('./routes/usuarios.routes');
  const { usuariosOrganizacionRouter } = require('./routes/usuariosOrganizacion.routes');
  app.use('/api/v1/organizaciones', organizacionesRouter);
  app.use('/api/v1/medidores', medidoresRouter);
  app.use('/api/v1/recursos', recursosRouter);
  app.use('/api/v1/usuarios', usuariosRouter);
  app.use('/api/v1/usuarios-organizacion', usuariosOrganizacionRouter);
  const { umbralesRouter } = require('./routes/umbrales.routes');
  const { metasRouter } = require('./routes/metas.routes');
  const { tarifasRouter } = require('./routes/tarifas.routes');
  const { recomendacionesRouter } = require('./routes/recomendaciones.routes');
  app.use('/api/v1/umbrales', umbralesRouter);
  app.use('/api/v1/metas', metasRouter);
  app.use('/api/v1/tarifas', tarifasRouter);
  app.use('/api/v1/recomendaciones', recomendacionesRouter);
  // Integración POS → Monitoreo: cae bajo el rate limit global de /api
  // (la cola del POS debe respetar RATE_LIMIT_MAX al reintentar).
  const { integrationsRouter } = require('./routes/integrations.routes');
  app.use('/api/v1/integrations', integrationsRouter);
  const { consumoRouter } = require('./routes/consumo.routes');
  const { alertasRouter } = require('./routes/alertas.routes');
  const { notificacionesRouter } = require('./routes/notificaciones.routes');
  const { reportesRouter } = require('./routes/reportes.routes');
  const { integracionesRouter } = require('./routes/integraciones.routes');
  const { auditoriaRouter } = require('./routes/auditoria.routes');
  app.use('/api/v1/consumo', consumoRouter);
  app.use('/api/v1/alertas', alertasRouter);
  app.use('/api/v1/notificaciones', notificacionesRouter);
  app.use('/api/v1/reportes', reportesRouter);
  // Frontend (services/auditoriaService.js) pide GET /api/v1/reportes/auditoria.
  app.use('/api/v1/reportes/auditoria', auditoriaRouter);
  app.use('/api/v1/integraciones', integracionesRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
