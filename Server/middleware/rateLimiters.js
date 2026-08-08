const rateLimit = require('express-rate-limit');

// Strict limiter for login attempts to slow brute-force attacks.
// 10 attempts per 15 minutes per IP.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please try again later.' },
});

// Strict limiter for password reset requests to prevent email flooding.
// 5 requests per hour per IP.
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many password reset requests. Please try again later.' },
});

module.exports = { authLimiter, passwordResetLimiter };
