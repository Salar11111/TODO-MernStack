const logger = require('../config/logger');

// Log every request with method, path, status code, and duration.
const requestLogger = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, originalUrl } = req;
    const { statusCode } = res;
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    logger[level]({ req: { method, url: originalUrl }, res: { statusCode }, duration }, `${method} ${originalUrl} ${statusCode} ${duration}ms`);
  });
  next();
};

module.exports = requestLogger;
