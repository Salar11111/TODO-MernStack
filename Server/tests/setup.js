process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_that_is_long_enough';
process.env.MONGO_URI = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/todoapp_test';
process.env.CLIENT_URL = 'http://localhost:5173';
