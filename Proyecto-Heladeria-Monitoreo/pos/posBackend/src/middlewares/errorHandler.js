'use strict';

function errorHandler(err, req, res, _next) {
  const reqId = req && req.id ? req.id : undefined;
  if (reqId) {
    console.error(`[${reqId}]`, err);
  } else {
    console.error(err);
  }
  const status = err.status || err.statusCode || 500;
  if (status >= 500) {
    const body = { error: 'Internal error' };
    if (reqId) body.requestId = reqId;
    return res.status(status).json(body);
  }
  return res.status(status).json({ error: err.message || 'Bad request' });
}

function notFound(_req, res) {
  res.status(404).json({ error: 'Not found' });
}

module.exports = { errorHandler, notFound };
