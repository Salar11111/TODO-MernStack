const mongoose = require('mongoose');

let connPromise;

// Cached connection for serverless environments (reused across warm invocations)
const ensureDb = async () => {
  if (mongoose.connection.readyState === 1) return;
  if (!connPromise) {
    connPromise = mongoose
      .connect(process.env.MONGO_URI, {
        // Fail fast so serverless platforms return an error response
        // instead of killing the function on a slow/hung connection
        serverSelectionTimeoutMS: 8000,
        connectTimeoutMS: 8000,
      })
      .catch((error) => {
      connPromise = undefined; // allow retry on next invocation
      throw error;
    });
  }
  await connPromise;
};

const connectDB = async () => {
  try {
    // Connect to MongoDB using the URI from our .env file
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    // Exit process with failure (1) if database connection fails
    process.exit(1);
  }
};

module.exports = connectDB;
module.exports.ensureDb = ensureDb;