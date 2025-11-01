/**
 * Structured Logging Utility
 *
 * Provides structured logging with:
 * - Request ID tracking
 * - Log levels (debug, info, warn, error)
 * - Sensitive data redaction
 * - Contextual information
 * - Timestamp and source tracking
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

// Current log level (can be set via LOG_LEVEL env var)
const CURRENT_LOG_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL || 'INFO'];

// Sensitive patterns to redact
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

    // Redact sensitive keys
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
 * Format log message with context
 */
function formatLogMessage(level, message, context = {}) {
  const timestamp = new Date().toISOString();
  const requestId = context.requestId || 'N/A';
  const userId = context.userId || 'N/A';
  const source = context.source || 'app';

  const redactedContext = redactObject(context);

  const logEntry = {
    timestamp,
    level,
    message,
    requestId,
    userId,
    source,
    ...redactedContext,
  };

  return JSON.stringify(logEntry);
}

/**
 * Logger class for structured logging
 */
class Logger {
  constructor(source = 'app') {
    this.source = source;
  }

  /**
   * Set request context
   */
  setContext(context) {
    this.context = context;
  }

  /**
   * Clear request context
   */
  clearContext() {
    this.context = null;
  }

  /**
   * Log debug message
   */
  debug(message, data = {}) {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.DEBUG) {
      const context = { ...this.context, ...data, source: this.source };
      console.log(formatLogMessage('DEBUG', message, context));
    }
  }

  /**
   * Log info message
   */
  info(message, data = {}) {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.INFO) {
      const context = { ...this.context, ...data, source: this.source };
      console.log(formatLogMessage('INFO', message, context));
    }
  }

  /**
   * Log warning message
   */
  warn(message, data = {}) {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.WARN) {
      const context = { ...this.context, ...data, source: this.source };
      console.warn(formatLogMessage('WARN', message, context));
    }
  }

  /**
   * Log error message
   */
  error(message, error = null, data = {}) {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.ERROR) {
      const errorData = error
        ? {
            errorType: error.constructor.name,
            errorMessage: error.message,
            errorStack: error.stack,
          }
        : {};

      const context = { ...this.context, ...data, ...errorData, source: this.source };
      console.error(formatLogMessage('ERROR', message, context));
    }
  }

  /**
   * Log API request
   */
  logApiRequest(method, endpoint, options = {}) {
    this.debug('API Request', {
      method,
      endpoint,
      params: options.params,
      timeout: options.timeout,
    });
  }

  /**
   * Log API response
   */
  logApiResponse(method, endpoint, status, duration, options = {}) {
    this.info('API Response', {
      method,
      endpoint,
      status,
      durationMs: duration,
      ...options,
    });
  }

  /**
   * Log API error
   */
  logApiError(method, endpoint, error, options = {}) {
    this.error('API Error', error, {
      method,
      endpoint,
      errorType: error.constructor.name,
      ...options,
    });
  }
}

/**
 * Create a logger instance
 */
function createLogger(source = 'app') {
  return new Logger(source);
}

/**
 * Express middleware for request logging
 */
function requestLoggingMiddleware(req, res, next) {
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const logger = createLogger('http');

  // Attach logger and request ID to request
  req.logger = logger;
  req.requestId = requestId;

  // Set context for all logs in this request
  logger.setContext({
    requestId,
    userId: req.session?.userId || null,
    method: req.method,
    path: req.path,
  });

  // Log request
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    query: req.query,
  });

  // Log response
  const originalSend = res.send;
  res.send = function (data) {
    logger.info('Outgoing response', {
      status: res.statusCode,
      contentLength: Buffer.byteLength(data),
    });

    logger.clearContext();
    return originalSend.call(this, data);
  };

  next();
}

module.exports = {
  createLogger,
  Logger,
  requestLoggingMiddleware,
  redactSensitive,
  redactObject,
  LOG_LEVELS,
};

