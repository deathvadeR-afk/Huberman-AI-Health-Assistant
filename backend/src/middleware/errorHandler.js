import { createLogger } from '../utils/logger.js';

const logger = createLogger('ErrorHandler');

export function errorHandler(err, req, res, next) {
    // Log the error
    logger.error('Unhandled error:', {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });

    // Don't leak error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';

    // Default error response
    let statusCode = err.statusCode || err.status || 500;
    let message = 'Internal Server Error';
    let code = 'INTERNAL_ERROR';

    // Handle specific error types
    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = 'Validation Error';
        code = 'VALIDATION_ERROR';
    } else if (err.name === 'UnauthorizedError') {
        statusCode = 401;
        message = 'Unauthorized';
        code = 'UNAUTHORIZED';
    } else if (err.name === 'ForbiddenError') {
        statusCode = 403;
        message = 'Forbidden';
        code = 'FORBIDDEN';
    } else if (err.name === 'NotFoundError') {
        statusCode = 404;
        message = 'Not Found';
        code = 'NOT_FOUND';
    } else if (err.name === 'TooManyRequestsError') {
        statusCode = 429;
        message = 'Too Many Requests';
        code = 'RATE_LIMIT_EXCEEDED';
    }

    // Prepare error response
    const errorResponse = {
        error: message,
        code: code,
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method
    };

    // Add error details in development
    if (isDevelopment) {
        errorResponse.details = err.message;
        errorResponse.stack = err.stack;
    }

    // Add custom error data if available
    if (err.data) {
        errorResponse.data = err.data;
    }

    res.status(statusCode).json(errorResponse);
}

export function notFoundHandler(req, res) {
    logger.warn('404 Not Found:', {
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });

    res.status(404).json({
        error: 'Not Found',
        code: 'NOT_FOUND',
        message: `The requested resource ${req.method} ${req.path} was not found`,
        timestamp: new Date().toISOString()
    });
}

// Custom error classes
export class ValidationError extends Error {
    constructor(message, data = null) {
        super(message);
        this.name = 'ValidationError';
        this.statusCode = 400;
        this.data = data;
    }
}

export class UnauthorizedError extends Error {
    constructor(message = 'Unauthorized') {
        super(message);
        this.name = 'UnauthorizedError';
        this.statusCode = 401;
    }
}

export class ForbiddenError extends Error {
    constructor(message = 'Forbidden') {
        super(message);
        this.name = 'ForbiddenError';
        this.statusCode = 403;
    }
}

export class NotFoundError extends Error {
    constructor(message = 'Not Found') {
        super(message);
        this.name = 'NotFoundError';
        this.statusCode = 404;
    }
}

export class TooManyRequestsError extends Error {
    constructor(message = 'Too Many Requests') {
        super(message);
        this.name = 'TooManyRequestsError';
        this.statusCode = 429;
    }
}
