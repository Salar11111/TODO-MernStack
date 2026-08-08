const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const logger = require('./config/logger');
const app = require('./app');

// 1. Load environment variables from the .env file
dotenv.config();

// 2. Connect to the local MongoDB database
connectDB();

// 3. Start the server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});

// 4. Graceful shutdown handlers
const shutdown = async (signal) => {
  logger.info(`${signal} received — shutting down gracefully`);
  server.close(async () => {
    await mongoose.disconnect();
    logger.info('Database connection closed');
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Catch unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error({ err }, `Unhandled rejection: ${err.message}`);
  server.close(() => process.exit(1));
});
