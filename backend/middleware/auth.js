const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const { StatusCodes } = require('http-status-codes');
const User = require('../models/User');
const redisClient = require('../config/redis');
const { 
  AuthenticationError,
  AuthorizationError,
  TokenExpiredError
} = require('../utils/errors');
const logger = require('../utils/logger');

// Convert callback-based functions to promises
const verifyToken = promisify(jwt.verify);
const redisGetAsync = promisify(redisClient.get).bind(redisClient);

// Security configurations
const TOKEN_ISSUER = 'your-app-name';
const TOKEN_AUDIENCE = 'your-app-client';
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 100; // 100 requests per window

// Token blacklist check
const isTokenRevoked = async (token) => {
  const result = await redisGetAsync(`blacklist:${token}`);
  return !!result;
};

// Advanced token verification
const verifyJWT = async (token) => {
  try {
    const decoded = await verifyToken(token, process.env.JWT_PUBLIC_KEY, {
      algorithms: ['RS256'],
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
      clockTolerance: 30 // 30 seconds grace period
    });

    if (await isTokenRevoked(token)) {
      throw new AuthenticationError('Token revoked');
    }

    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new TokenExpiredError('Token has expired');
    }
    throw new AuthenticationError('Invalid token');
  }
};

// Multi-strategy token extraction
const getToken = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  if (req.cookies?.accessToken) {
    return req.cookies.accessToken;
  }
  return null;
};

// Enhanced authentication middleware
exports.protect = async (req, res, next) => {
  try {
    // 1. Get token
    const token = getToken(req);
    if (!token) throw new AuthenticationError('Authentication required');

    // 2. Verify token
    const decoded = await verifyJWT(token);

    // 3. Check if user exists
    const currentUser = await User.findById(decoded.sub)
      .select('+passwordChangedAt +active +mfaEnabled')
      .cache({ key: `user:${decoded.sub}` });

    if (!currentUser || !currentUser.active) {
      throw new AuthenticationError('User no longer exists');
    }

    // 4. Check if user changed password after token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      throw new AuthenticationError('Password changed recently');
    }

    // 5. Check MFA status
    if (currentUser.mfaEnabled && !decoded.mfaVerified) {
      throw new AuthenticationError('MFA verification required');
    }

    // 6. Attach user to request
    req.user = currentUser;
    req.token = token;

    // 7. Security headers
    res.set({
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': "default-src 'self'",
      'X-Content-Type-Options': 'nosniff'
    });

    next();
  } catch (error) {
    // Rate limiting on failed attempts
    const clientIP = req.ip || req.connection.remoteAddress;
    const attempts = await redisClient.incr(`auth:attempts:${clientIP}`);
    if (attempts === 1) {
      await redisClient.expire(`auth:attempts:${clientIP}`, RATE_LIMIT_WINDOW);
    }

    if (attempts > RATE_LIMIT_MAX) {
      logger.warn(`Rate limit exceeded for IP: ${clientIP}`);
      return next(new AuthorizationError('Too many requests', StatusCodes.TOO_MANY_REQUESTS));
    }

    logger.error(`Authentication failed: ${error.message}`);
    next(error);
  }
};

// Enhanced authorization middleware
exports.authorize = (options = {}) => {
  return (req, res, next) => {
    try {
      // Role-based access control
      if (options.roles && !options.roles.includes(req.user.role)) {
        throw new AuthorizationError(
          `Role ${req.user.role} is not authorized`,
          StatusCodes.FORBIDDEN
        );
      }

      // Permission-based access control
      if (options.permissions) {
        const hasPermission = options.permissions.every(permission =>
          req.user.permissions.includes(permission)
        );
        if (!hasPermission) {
          throw new AuthorizationError(
            'Insufficient permissions',
            StatusCodes.FORBIDDEN
          );
        }
      }

      // Resource ownership check
      if (options.ownerField && req.params.id !== req.user[options.ownerField].toString()) {
        throw new AuthorizationError(
          'Not authorized to access this resource',
          StatusCodes.FORBIDDEN
        );
      }

      next();
    } catch (error) {
      logger.warn(`Authorization failed: ${error.message}`);
      next(error);
    }
  };
};

// Token revocation middleware
exports.revokeToken = async (req, res, next) => {
  try {
    const { token } = req;
    const decoded = jwt.decode(token);
    
    // Add to blacklist with token expiration
    const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
    if (expiresIn > 0) {
      await redisClient.set(`blacklist:${token}`, 'revoked', 'EX', expiresIn);
    }
    
    next();
  } catch (error) {
    next(error);
  }
};