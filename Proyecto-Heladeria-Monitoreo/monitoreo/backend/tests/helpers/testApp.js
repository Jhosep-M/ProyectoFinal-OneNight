require('./env');
const express = require('express');
const { requestId } = require('../../src/middlewares/requestId.middleware');
const { notFound, errorHandler } = require('../../src/middlewares/error.middleware');

// App mínima con identidad inyectada para probar routers de negocio sin JWT real.
function testApp(user, mounts) {
  const app = express();
  app.use(express.json());
  app.use(requestId);
  app.use((req, _res, next) => { if (user) req.user = user; next(); });
  for (const [path, router] of mounts) app.use(path, router);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

async function listen(app) {
  const server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
  return { server, base: `http://127.0.0.1:${server.address().port}` };
}

module.exports = { testApp, listen };
