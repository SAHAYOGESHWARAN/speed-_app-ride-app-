const { StatusCodes } = require('http-status-codes');
const winston = require('winston');
const { format } = require('logform');
const { errors } = require('celebrate');
const mongoose = require('mongoose');
const Sentry = require('@sentry/node');

// Custom error classes
class APIError extends Error {
  constructor(message, statusCode, code, details) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
    this.code = code || 'E_INTERNAL_ERROR';
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends APIError {
  constructor(errors) {
    super('Validation failed', StatusCodes.BAD_REQUEST, 'E_VALIDATION', errors);
  }
}

class NotFoundError extends APIError {
  constructor(resource) {
    super(`${resource || 'Resource'} not found`, StatusCodes.NOT_FOUND, 'E_NOT_FOUND');
  }
}

// Configure logger
const logger = winston.createLogger({
  level: 'error',
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log' }),
    new winston.transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    })
  ]
});

const errorHandler = (err, req, res, next) => {
  // Default error response
  let error = {
    code: err.code || 'E_INTERNAL_ERROR',
    message: err.message || 'Internal Server Error',
    statusCode: err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR,
    details: err.details,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.originalUrl,
    requestId: req.id
  };

  // Handle specific error types
  if (err instanceof mongoose.Error.CastError) {
    error = {
      code: 'E_INVALID_ID',
      message: `Invalid ${err.path}: ${err.value}`,
      statusCode: StatusCodes.BAD_REQUEST
    };
  } else if (err instanceof mongoose.Error.ValidationError) {
    error = new ValidationError(
      Object.values(err.errors).map(e => ({
        field: e.path,
        message: e.message
      }))
    );
  } else if (err.code === 11000) { // MongoDB duplicate key
    const field = Object.keys(err.keyValue)[0];
    error = new APIError(
      `Duplicate field value: ${field}`,
      StatusCodes.CONFLICT,
      'E_DUPLICATE'
    );
  } else if (err.name === 'JsonWebTokenError') {
    error = new APIError('Invalid token', StatusCodes.UNAUTHORIZED, 'E_INVALID_TOKEN');
  } else if (err.name === 'TokenExpiredError') {
    error = new APIError('Token expired', StatusCodes.UNAUTHORIZED, 'E_TOKEN_EXPIRED');
  } else if (errors.isCelebrateError(err)) { // Joi validation errors
    const details = [];
    for (const [segment, joiError] of err.details.entries()) {
      details.push(...joiError.details.map(e => ({
        field: e.context.key,
        message: e.message.replace(/"/g, '')
      })));
    }
    error = new ValidationError(details);
  }

  // Log error information
  logger.error({
    message: error.message,
    code: error.code,
    status: error.statusCode,
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
    user: req.user ? req.user.id : 'anonymous',
    stack: error.stack,
    timestamp: new Date().toISOString()
  });

  // Capture exceptions in Sentry
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(err);
  }

  // Security headers
  const securityHeaders = {
    'Content-Security-Policy': "default-src 'self'",
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY'
  };

  // Send response
  res
    .set(securityHeaders)
    .status(error.statusCode)
    .json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details && { details: error.details }),
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      },
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString()
      }
    });
};

module.exports = {
  errorHandler,
  APIError,
  ValidationError,
  NotFoundError
};