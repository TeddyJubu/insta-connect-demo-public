/**
 * Winston Logger Configuration
 *
 * Provides centralized logging with:
 * - Multiple transports (console, file, daily rotation)
 * - Structured JSON logging
 * - Request ID tracking
 * - Sensitive data redaction
 * - Log levels and filtering
 */

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

const LOG_DIR = process.env.LOG_DIR || path.join(__dirname, '../../logs');

/**
 * Sensitive patterns to redact
 */
const SENSITIVE_PATTERNS = [
  /access_token['":\s=]+([a-zA-Z0-9_-]+)/gi,
  /token['":\s=]+([a-zA-Z0-9_-]+)/gi,
  /secret['":\s=]+([a-zA-Z0-9_-]+)/gi,
  /password['":\s=]+([a-zA-Z0-9_-]+)/gi,
  /authorization['":\s=]+Bearer\s+([a-zA-Z0-9_.-]+)/gi,
];

/**
 * Redact sensitive information from strings
 */
function redactSensitive(str) {
  if (typeof str !== 'string') {
    return str;
  }

  let redacted = str;
  SENSITIVE_PATTERNS.forEach((pattern) => {
    redacted = redacted.replace(pattern, (match, token) => {
      const prefix = token.substring(0, 4);
      const suffix = token.substring(token.length - 4);
      return match.replace(token, `${prefix}...${suffix}`);
    });
  });

  return redacted;
}

/**
 * Redact sensitive information from objects
 */
function redactObject(obj, depth = 0) {
  if (depth > 5) return '[Circular]';
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => redactObject(item, depth + 1));
  }

  const redacted = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    if (
      lowerKey.includes('token') ||
      lowerKey.includes('secret') ||
      lowerKey.includes('password') ||
      lowerKey.includes('authorization')
    ) {
      if (typeof value === 'string') {
        const prefix = value.substring(0, 4);
        const suffix = value.substring(value.length - 4);
        redacted[key] = `${prefix}...${suffix}`;
      } else {
        redacted[key] = '[REDACTED]';
      }
    } else if (typeof value === 'object') {
      redacted[key] = redactObject(value, depth + 1);
    } else if (typeof value === 'string') {
      redacted[key] = redactSensitive(value);
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

/**
 * Custom format for Winston
 */
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf((info) => {
    const redactedMeta = redactObject(info);
    return JSON.stringify(redactedMeta);
  })
);

/**
 * Create Winston logger instance
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  defaultMeta: { service: 'insta-connect-demo' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf((info) => {
          const redactedMeta = redactObject(info);
          return `${info.timestamp} [${info.level}] ${JSON.stringify(redactedMeta)}`;
        })
      ),
    }),

    // Error log file (daily rotation)
    new DailyRotateFile({
      filename: path.join(LOG_DIR, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxDays: '14d',
      format: customFormat,
    }),

    // Combined log file (daily rotation)
    new DailyRotateFile({
      filename: path.join(LOG_DIR, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxDays: '14d',
      format: customFormat,
    }),
  ],
});

/**
 * Express middleware for request logging
 */
function requestLoggingMiddleware(req, res, next) {
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Attach request ID to request and response
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  // Log incoming request
  logger.info('Incoming request', {
    requestId,
    method: req.method,
    path: req.path,
    query: req.query,
    userId: req.session?.userId || null,
    ip: req.ip,
  });

  // Track response time
  const startTime = Date.now();

  // Log outgoing response
  const originalSend = res.send;
  res.send = function (data) {
    const duration = Date.now() - startTime;

    logger.info('Outgoing response', {
      requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      contentLength: Buffer.byteLength(data),
    });

    return originalSend.call(this, data);
  };

  next();
}

/**
 * Error logging middleware
 */
function errorLoggingMiddleware(err, req, res, next) {
  const requestId = req.requestId || 'unknown';

  logger.error('Request error', {
    requestId,
    method: req.method,
    path: req.path,
    status: err.status || 500,
    error: err.message,
    stack: err.stack,
    userId: req.session?.userId || null,
  });

  next(err);
}

module.exports = {
  logger,
  requestLoggingMiddleware,
  errorLoggingMiddleware,
  redactSensitive,
  redactObject,
};

