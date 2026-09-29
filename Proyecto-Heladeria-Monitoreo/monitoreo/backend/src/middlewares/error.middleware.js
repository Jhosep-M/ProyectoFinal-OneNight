const { logger } = require('../utils/logger');
const { AppError } = require('../utils/errors');

function notFound(req, res) {
  res.status(404).json({ error: 'Ruta no encontrada' });
}

function errorHandler(err, req, res, _next) {
  const status = err instanceof AppError ? err.status : err.status || 500;
  const payload = err instanceof AppError
    ? { error: err.error, ...(err.detail ? { detail: err.detail } : {}) }
    : { error: status >= 500 ? 'Error interno' : 'Error de solicitud' };
  logger.error({ reqId: req.id, status, msg: err.message }, 'error handler');
  res.status(status).json(payload); // jamás stack traces al cliente
}

module.exports = { notFound, errorHandler };
