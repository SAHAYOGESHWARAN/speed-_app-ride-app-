const { inspect } = require('util');
const logger = require('../utils/logger');
const { NODE_ENV } = process.env;

class AppError extends Error {
  constructor(
    message,
    statusCode = 500,
    {
      code = 'E_INTERNAL_ERROR',
      details = null,
      cause = null,
      i18nKey = null,
      log = true,
      metadata = {}
    } = {}
  ) {
    super(message);
    
    // Core error properties
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.code = code;
    this.details = details;
    this.i18nKey = i18nKey;
    this.timestamp = new Date().toISOString();
    this.metadata = metadata;
    this.cause = cause;
    
    // Operational vs programming errors
    this.isOperational = true;
    
    // Security: Sanitize error message in production
    if (NODE_ENV === 'production') {
      this.message = this._sanitizeErrorMessage(message);
    }

    // Logging control
    if (log) {
      this._logError();
    }

    // Capture stack trace (excluding constructor call)
    Error.captureStackTrace(this, this.constructor);
  }

  // Create production-safe error response
  toProductionJSON() {
    return {
      status: this.status,
      code: this.code,
      message: this.message,
      ...(this.i18nKey && { i18nKey: this.i18nKey }),
      ...(this.details && { details: this.details }),
      timestamp: this.timestamp
    };
  }

  // Create detailed error response for development
  toDevelopmentJSON() {
    return {
      ...this.toProductionJSON(),
      stack: this.stack,
      metadata: this.metadata,
      ...(this.cause && { cause: inspect(this.cause) })
    };
  }

  // Error logging handler
  _logError() {
    const logEntry = {
      statusCode: this.statusCode,
      code: this.code,
      message: this.message,
      stack: this.stack,
      metadata: this.metadata,
      ...(this.cause && { cause: inspect(this.cause) })
    };

    if (this.statusCode >= 500) {
      logger.error(logEntry);
    } else {
      logger.warn(logEntry);
    }
  }

  // Sanitize sensitive error information
  _sanitizeErrorMessage(msg) {
    return msg.replace(/password: '.+?'/gi, 'password: ***')
             .replace(/Authorization: '.+?'/gi, 'Authorization: ***');
  }

  // Common error types as static methods
  static badRequest(message, options) {
    return new AppError(message, 400, { code: 'E_BAD_REQUEST', ...options });
  }

  static unauthorized(message = 'Authentication required', options) {
    return new AppError(message, 401, { code: 'E_UNAUTHORIZED', ...options });
  }

  static forbidden(message = 'Access denied', options) {
    return new AppError(message, 403, { code: 'E_FORBIDDEN', ...options });
  }

  static notFound(resource, options) {
    return new AppError(
      `${resource || 'Resource'} not found`,
      404,
      { code: 'E_NOT_FOUND', ...options }
    );
  }

  static conflict(message = 'Resource conflict', options) {
    return new AppError(message, 409, { code: 'E_CONFLICT', ...options });
  }

  static validation(errors, message = 'Validation failed', options) {
    return new AppError(message, 422, {
      code: 'E_VALIDATION',
      details: errors,
      ...options
    });
  }
}

// Subclass for HTTP errors
class HttpError extends AppError {
  constructor(message, statusCode, options) {
    super(message, statusCode, options);
    this.isHttpError = true;
  }
}

// Subclass for database errors
class DatabaseError extends AppError {
  constructor(message, options) {
    super(message, 500, { code: 'E_DATABASE', ...options });
    this.isDatabaseError = true;
  }
}

module.exports = {
  AppError,
  HttpError,
  DatabaseError
};