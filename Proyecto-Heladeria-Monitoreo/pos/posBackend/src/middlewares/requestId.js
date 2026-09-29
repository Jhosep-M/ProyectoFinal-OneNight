'use strict';
const { randomUUID } = require('crypto');
function requestId(req, res, next) { req.id = req.headers['x-request-id'] || randomUUID(); res.setHeader('X-Request-Id', req.id); return next(); }
module.exports = { requestId };
