/**
 * N8N Security Middleware
 * Provides security measures for N8N integration endpoints
 */

const rateLimit = require('express-rate-limit');
const { createLogger } = require('../utils/logger');

const logger = createLogger('n8nSecurity');

/**
 * Validate N8N callback secret
 */
function validateCallbackSecret(req, res, next) {
  const callbackSecret = process.env.N8N_CALLBACK_SECRET;
  const headerSecret = req.headers['x-callback-secret'];

  if (!callbackSecret) {
    logger.error('N8N_CALLBACK_SECRET is not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  if (!headerSecret) {
    logger.warn('N8N callback request missing X-Callback-Secret header', {
      ip: req.ip,
      path: req.path,
    });
    return res.status(401).json({ error: 'Missing authentication header' });
  }

  // Use constant-time comparison to prevent timing attacks
  const isValid = constantTimeCompare(headerSecret, callbackSecret);

  if (!isValid) {
    logger.warn('N8N callback request with invalid secret', {
      ip: req.ip,
      path: req.path,
      headerLength: headerSecret.length,
    });
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeCompare(a, b) {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Rate limiter for N8N callback endpoint
 * Allows 100 requests per 15 minutes per IP
 */
const n8nCallbackLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many N8N callback requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  },
  handler: (req, res) => {
    logger.warn('N8N callback rate limit exceeded', {
      ip: req.ip,
      path: req.path,
    });
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: req.rateLimit.resetTime,
    });
  },
});

/**
 * Rate limiter for N8N queue endpoint
 * Allows 50 requests per 15 minutes per user
 */
const n8nQueueLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each user to 50 requests per windowMs
  message: 'Too many queue requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  },
  handler: (req, res) => {
    logger.warn('N8N queue rate limit exceeded', {
      userId: req.session?.userId,
      ip: req.ip,
    });
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: req.rateLimit.resetTime,
    });
  },
});

/**
 * Rate limiter for N8N retry endpoint
 * Allows 20 requests per 15 minutes per user
 */
const n8nRetryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each user to 20 requests per windowMs
  message: 'Too many retry requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  },
  handler: (req, res) => {
    logger.warn('N8N retry rate limit exceeded', {
      userId: req.session?.userId,
      ip: req.ip,
    });
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: req.rateLimit.resetTime,
    });
  },
});

/**
 * Security logging middleware for N8N endpoints
 */
function securityLogging(req, res, next) {
  const startTime = Date.now();

  // Log request
  logger.info('N8N endpoint request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userId: req.session?.userId,
    userAgent: req.get('user-agent'),
  });

  // Log response
  const originalSend = res.send;
  res.send = function (data) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    if (statusCode >= 400) {
      logger.warn('N8N endpoint error response', {
        method: req.method,
        path: req.path,
        statusCode,
        duration,
        ip: req.ip,
        userId: req.session?.userId,
      });
    } else {
      logger.debug('N8N endpoint success response', {
        method: req.method,
        path: req.path,
        statusCode,
        duration,
      });
    }

    return originalSend.call(this, data);
  };

  next();
}

module.exports = {
  validateCallbackSecret,
  n8nCallbackLimiter,
  n8nQueueLimiter,
  n8nRetryLimiter,
  securityLogging,
};

