const mongoose = require('mongoose');
const { logger } = require('../utils/logger');
const { exitProcess } = require('../utils/helpers');

// Configuration options
const DEFAULT_OPTIONS = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  autoIndex: process.env.NODE_ENV !== 'production',
  poolSize: parseInt(process.env.DB_POOL_SIZE) || 10,
  socketTimeoutMS: parseInt(process.env.DB_SOCKET_TIMEOUT) || 45000,
  serverSelectionTimeoutMS: 5000,
  heartbeatFrequencyMS: process.env.NODE_ENV === 'production' ? 10000 : 5000,
  retryWrites: true,
  w: 'majority'
};

// SSL configuration for production
const SSL_OPTIONS = process.env.DB_SSL === 'true' ? {
  ssl: true,
  sslValidate: true,
  sslCA: process.env.DB_CA_PATH || '',
  sslCert: process.env.DB_CERT_PATH || '',
  sslKey: process.env.DB_KEY_PATH || ''
} : {};

// Connection events handler
const handleConnectionEvents = () => {
  mongoose.connection.on('connected', () => {
    logger.info('MongoDB connection established');
  });

  mongoose.connection.on('error', (err) => {
    logger.error(`MongoDB connection error: ${err.message}`);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB connection lost');
  });

  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB connection reestablished');
  });
};

// Validate MongoDB URI format
const validateMongoURI = (uri) => {
  const mongoURIPattern = /^mongodb(\+srv)?:\/\/(.*)/;
  if (!mongoURIPattern.test(uri)) {
    throw new Error('Invalid MongoDB URI format');
  }
};

// Enhanced connection handler with retry logic
const connectDB = async (retryCount = 0) => {
  try {
    validateMongoURI(process.env.MONGO_URI);
    
    const connection = await mongoose.connect(process.env.MONGO_URI, {
      ...DEFAULT_OPTIONS,
      ...SSL_OPTIONS
    });

    handleConnectionEvents();
    
    // Enable debug mode in development
    if (process.env.NODE_ENV === 'development') {
      mongoose.set('debug', (collectionName, method, query, doc) => {
        logger.debug(`MongoDB: ${collectionName}.${method}`, {
          query,
          doc
        });
      });
    }

    return connection;
  } catch (err) {
    const maxRetries = parseInt(process.env.DB_MAX_RETRIES) || 3;
    const retryDelay = parseInt(process.env.DB_RETRY_DELAY) || 5000;

    if (retryCount < maxRetries) {
      logger.warn(`Connection attempt ${retryCount + 1}/${maxRetries}. Retrying in ${retryDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return connectDB(retryCount + 1);
    }

    logger.error(`Failed to connect to MongoDB after ${maxRetries} attempts: ${err.message}`);
    exitProcess(1);
  }
};

// Graceful shutdown handler
const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB connection closed');
  } catch (err) {
    logger.error(`Error closing MongoDB connection: ${err.message}`);
  }
};

// Export both connection and mongoose instance
module.exports = {
  mongoose,
  connectDB,
  disconnectDB
};