const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const pinoHttp = require('pino-http');
const { env } = require('./config/env');
const { apiLimiter, authLimiter } = require('./middlewares/rateLimit');
const { requestId } = require('./middlewares/requestId');
const { errorHandler, notFound } = require('./middlewares/errorHandler');
const { healthRouter } = require('./routes/health');
const { salesRouter } = require('./routes/sales');
const { shiftsRouter } = require('./routes/shifts');
const { productsRouter } = require('./routes/products');
const { categoriesRouter } = require('./routes/categories');
const { usersRouter } = require('./routes/users');
const { inventoryRouter } = require('./routes/inventory');
const { suppliersRouter } = require('./routes/suppliers');
const { customersRouter } = require('./routes/customers');
const { ordersRouter } = require('./routes/orders');
const { mesasRouter } = require('./routes/mesas');
const { paymentsRouter } = require('./routes/payments');
const { returnsRouter } = require('./routes/returns');
const { promotionsRouter } = require('./routes/promotions');
const { auditRouter } = require('./routes/audit');
const { integrationsRouter } = require('./routes/integrations');
const { configRouter } = require('./routes/config');
const { meRouter } = require('./routes/me');

function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet({
    contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], objectSrc: ["'none'"] } },
    hsts: { maxAge: 31536000, includeSubDomains: true },
    noSniff: true,
    xssFilter: true,
    hidePoweredBy: true,
  }));
  if (env.nodeEnv === 'production' && env.corsOrigin.includes('*')) {
    throw new Error('CORS wildcard prohibido en producción');
  }
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(requestId);
  app.use(pinoHttp());
  app.use('/api', apiLimiter);

  app.use('/health', healthRouter);
  app.use('/api/v1/sales', salesRouter);
  app.use('/api/v1/shifts', shiftsRouter);
  app.use('/api/v1/products', productsRouter);
  app.use('/api/v1/categories', categoriesRouter);
  app.use('/api/v1/users', usersRouter);
  app.use('/api/v1/inventory', inventoryRouter);
  app.use('/api/v1/suppliers', suppliersRouter);
  app.use('/api/v1/customers', customersRouter);
  app.use('/api/v1/orders', ordersRouter);
  app.use('/api/v1/mesas', mesasRouter);
  app.use('/api/v1/payments', paymentsRouter);
  app.use('/api/v1/returns', returnsRouter);
  app.use('/api/v1/promotions', promotionsRouter);
  app.use('/api/v1/audit', auditRouter);
  app.use('/api/v1/integrations/alerts', authLimiter);
  app.use('/api/v1/integrations', integrationsRouter);
  app.use('/api/v1/config', configRouter);
  app.use('/api/v1/me', meRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
