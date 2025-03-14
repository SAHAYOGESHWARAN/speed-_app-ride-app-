const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const config = require('./config/env.config');
const errorHandler = require('./middleware/errorHandler');
const { createTerminus } = require('@godaddy/terminus');
const redis = require('./config/redis');
const logger = require('./utils/logger');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const { setupRequestContext } = require('./middleware/requestContext');

const app = express();

// Cluster mode for production
if (config.NODE_ENV === 'production' && cluster.isMaster) {
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  cluster.on('exit', (worker) => {
    logger.error(`Worker ${worker.process.pid} died`);
    cluster.fork();
  });
} else {
  // Database connection with advanced options
  mongoose.connect(config.DB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    poolSize: config.MONGO_POOL_SIZE || 10,
    ssl: config.MONGO_SSL === 'true',
    sslValidate: true,
    sslCA: config.MONGO_CA_PATH,
    sslCert: config.MONGO_CERT_PATH,
    sslKey: config.MONGO_KEY_PATH
  })
  .then(() => logger.info('Database connected successfully'))
  .catch(err => logger.error('Database connection error:', err));

  // Trust proxy
  app.set('trust proxy', true);

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'script-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:', 'https://*.s3.amazonaws.com']
      }
    },
    hsts: {
      maxAge: config.HSTS_MAX_AGE || 31536000,
      includeSubDomains: true
    }
  }));

  // CORS configuration
  app.use(cors({
    origin: config.CORS_ORIGINS.split(','),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    credentials: true
  }));

  // Request parsing
  app.use(express.json({ limit: config.FILE_UPLOAD_LIMIT || '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  // Security middleware
  app.use(mongoSanitize());
  app.use(xss());
  app.use(hpp({
    whitelist: ['price', 'duration'] 
  }));

  // Rate limiting with Redis
  const apiLimiter = rateLimit({
    store: new rateLimit.RedisStore({
      client: redis
    }),
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: config.RATE_LIMIT_API || 100,
    keyGenerator: (req) => req.ip + req.headers['user-agent'],
    handler: (req, res) => {
      res.status(429).json({
        error: 'Too many requests, please try again later'
      });
    }
  });

  // Logging
  app.use(setupRequestContext);
  app.use(morgan(config.NODE_ENV === 'development' ? 'dev' : 'combined', {
    stream: logger.stream
  }));

  // API documentation
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Health check endpoint
  app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

  // Apply rate limiting to API routes
  app.use('/api/v1', apiLimiter);

  // Routes
  app.use('/api/v1/auth', require('./routes/authRoutes'));
  app.use('/api/v1/users', require('./routes/userRoutes'));
  app.use('/api/v1/bookings', require('./routes/bookingRoutes'));

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      error: 'Endpoint not found'
    });
  });

  // Error handling
  app.use(errorHandler);

  // Graceful shutdown
  const server = app.listen(config.PORT || 5000, () => {
    logger.info(`Server running in ${config.NODE_ENV} mode on port ${config.PORT}`);
  });

  const terminus = createTerminus(server, {
    signals: ['SIGINT', 'SIGTERM'],
    healthChecks: {
      '/health': () => Promise.resolve()
    },
    onSignal: async () => {
      logger.info('Server is starting cleanup');
      await mongoose.disconnect();
      await redis.quit();
    },
    onShutdown: async () => {
      logger.info('Cleanup finished, server is shutting down');
    },
    logger: (msg, err) => logger.error(msg, err)
  });

  // Handle unhandled exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
  });
}