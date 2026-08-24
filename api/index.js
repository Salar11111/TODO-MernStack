const app = require('../Server/app');
const { ensureDb } = require('../Server/config/db');

module.exports = async (req, res) => {
  try {
    await ensureDb();
  } catch (err) {
    return res.status(503).json({ message: 'Database unavailable' });
  }
  return app(req, res);
};
