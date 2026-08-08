const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/authRoutes');
const todoRoutes = require('./routes/todoRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const requestId = require('./middleware/requestId');
const requestLogger = require('./middleware/requestLogger');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

// Security headers with a tuned Content Security Policy.
// In development, 'unsafe-inline' is needed for Vite's injected styles.
const isProd = process.env.NODE_ENV === 'production';
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: isProd ? ["'self'"] : ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        fontSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// CORS - allow only configured origins (comma-separated in CLIENT_URL)
app.use(
  cors({
    origin: process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : true,
    credentials: true,
  })
);

app.use(express.json());

// Attach a request id to every request for log correlation
app.use(requestId);

// Request logging (structured, with request id)
app.use(requestLogger);

// Global rate limiting for API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
});
app.use('/api', apiLimiter);

// Health check — includes database connection status
app.get('/api/health', (req, res) => {
  const mongoStates = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  const readyState = mongoose.connection.readyState;
  const status = readyState === 1 ? 'ok' : 'degraded';
  res.status(readyState === 1 ? 200 : 503).json({
    status,
    database: mongoStates[readyState] || 'unknown',
    timestamp: new Date().toISOString(),
    requestId: req.id,
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/todos', todoRoutes);

// Serve built client in production
if (process.env.NODE_ENV === 'production') {
  const clientPath = path.join(__dirname, 'public');
  app.use(express.static(clientPath));

  // SPA fallback — serve index.html for any non-API route
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientPath, 'index.html'));
  });
}

// 404 for unknown API routes (only if not already handled by SPA fallback)
if (process.env.NODE_ENV !== 'production') {
  app.use(notFound);
}

// Custom Error Handling Middleware (MUST be last)
app.use(errorHandler);

module.exports = app;
