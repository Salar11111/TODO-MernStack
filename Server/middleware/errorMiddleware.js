// 404 handler for unknown routes - must be registered after all routes
const notFound = (req, res, next) => {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
};

// Central error handler - catches any error passed to next()
const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;

  if (err.name === 'CastError') {
    statusCode = 400; // Invalid ObjectId
  } else if (err.name === 'ValidationError') {
    statusCode = 400; // Mongoose validation error
  } else if (err.code === 11000) {
    statusCode = 409; // Duplicate key
  }

  // Log server errors (5xx) with request id for correlation
  if (statusCode >= 500) {
    console.error(`[req ${req.id || '-'}] ${statusCode} ${err.message}`, err.stack);
  }

  res.status(statusCode);

  res.json({
    message: err.message || 'Server Error',
    // Only show the stack trace in development mode, hide it in production for security
    stack: process.env.NODE_ENV === 'development' ? err.stack : null,
    requestId: req.id || undefined,
  });
};

module.exports = { notFound, errorHandler };
