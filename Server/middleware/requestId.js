const crypto = require('crypto');

// Attach a unique request id to every request and expose it via a response
// header. Useful for correlating logs and client-side error reports.
module.exports = function requestId(req, res, next) {
  const id = req.headers['x-request-id'] || crypto.randomUUID();
  req.id = id;
  res.setHeader('X-Request-Id', id);
  next();
};
