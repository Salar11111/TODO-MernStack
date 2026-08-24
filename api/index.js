const app = require('../Server/app');
const { ensureDb } = require('../Server/config/db');

// One-time cold-start diagnostics (values are never logged, only presence)
console.log('[api] invoked', JSON.stringify({
  hasMongoUri: !!process.env.MONGO_URI,
  hasJwtSecret: !!process.env.JWT_SECRET,
  nodeEnv: process.env.NODE_ENV || '(unset)',
}));

process.on('uncaughtException', (err) => {
  console.error('[api] uncaughtException:', err && err.stack);
});
process.on('unhandledRejection', (err) => {
  console.error('[api] unhandledRejection:', err && (err.stack || err.message));
});

module.exports = async (req, res) => {
  try {
    await ensureDb();
  } catch (err) {
    console.error('[api] database connection failed:', err && (err.stack || err.message));
    return res.status(503).json({ message: 'Database unavailable' });
  }
  try {
    return app(req, res);
  } catch (err) {
    console.error('[api] handler threw synchronously:', err && err.stack);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }
};
