const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.logError(err, req);

  // Default error response
  let error = {
    message: 'Internal Server Error',
    status: 500,
    code: 'INTERNAL_ERROR'
  };

  // Handle specific error types
  if (err.name === 'ValidationError') {
    error = {
      message: 'Validation Error',
      status: 400,
      code: 'VALIDATION_ERROR',
      details: err.details || err.message
    };
  } else if (err.name === 'CastError') {
    error = {
      message: 'Invalid ID format',
      status: 400,
      code: 'INVALID_ID'
    };
  } else if (err.code === '23505') { // PostgreSQL unique violation
    error = {
      message: 'Duplicate entry',
      status: 409,
      code: 'DUPLICATE_ENTRY'
    };
  } else if (err.code === '23503') { // PostgreSQL foreign key violation
    error = {
      message: 'Referenced record not found',
      status: 400,
      code: 'FOREIGN_KEY_ERROR'
    };
  } else if (err.code === '23502') { // PostgreSQL not null violation
    error = {
      message: 'Required field missing',
      status: 400,
      code: 'REQUIRED_FIELD_MISSING'
    };
  } else if (err.name === 'JsonWebTokenError') {
    error = {
      message: 'Invalid token',
      status: 401,
      code: 'INVALID_TOKEN'
    };
  } else if (err.name === 'TokenExpiredError') {
    error = {
      message: 'Token expired',
      status: 401,
      code: 'TOKEN_EXPIRED'
    };
  } else if (err.type === 'entity.parse.failed') {
    error = {
      message: 'Invalid JSON format',
      status: 400,
      code: 'INVALID_JSON'
    };
  } else if (err.type === 'entity.too.large') {
    error = {
      message: 'Request entity too large',
      status: 413,
      code: 'PAYLOAD_TOO_LARGE'
    };
  } else if (err.code === 'ECONNREFUSED') {
    error = {
      message: 'Database connection failed',
      status: 503,
      code: 'DATABASE_ERROR'
    };
  } else if (err.code === 'ENOTFOUND') {
    error = {
      message: 'External service unavailable',
      status: 503,
      code: 'SERVICE_UNAVAILABLE'
    };
  } else if (err.status && err.status < 500) {
    // Client errors (4xx)
    error = {
      message: err.message || 'Bad Request',
      status: err.status,
      code: err.code || 'CLIENT_ERROR'
    };
  } else if (err.message && process.env.NODE_ENV === 'development') {
    // In development, show actual error message
    error.message = err.message;
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    error.stack = err.stack;
  }

  // Add request ID for tracking
  if (req.id) {
    error.requestId = req.id;
  }

  // Send error response
  res.status(error.status).json({
    error: error.message,
    code: error.code,
    ...(error.details && { details: error.details }),
    ...(error.stack && { stack: error.stack }),
    ...(error.requestId && { requestId: error.requestId }),
    timestamp: new Date().toISOString()
  });
};

// 404 handler
const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    code: 'ROUTE_NOT_FOUND',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
};

// Async error wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Custom error class
class AppError extends Error {
  constructor(message, statusCode, code = null) {
    super(message);
    this.status = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error classes
class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(message, 409, 'CONFLICT');
  }
}

class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'TOO_MANY_REQUESTS');
  }
}

class ServiceUnavailableError extends AppError {
  constructor(message = 'Service unavailable') {
    super(message, 503, 'SERVICE_UNAVAILABLE');
  }
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  TooManyRequestsError,
  ServiceUnavailableError
};