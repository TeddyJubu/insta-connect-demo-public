/**
 * Metrics Collection and Monitoring
 *
 * Provides:
 * - Request metrics (count, duration, status codes)
 * - API call metrics (success, failures, retries)
 * - Database metrics (query count, duration)
 * - Token refresh metrics
 * - Webhook metrics
 */

const { logger } = require('./winstonLogger');

/**
 * Metrics collector
 */
class MetricsCollector {
  constructor() {
    this.metrics = {
      http: {
        requests: 0,
        responses: 0,
        errors: 0,
        totalDuration: 0,
        statusCodes: {},
      },
      api: {
        calls: 0,
        successes: 0,
        failures: 0,
        retries: 0,
        totalDuration: 0,
        errors: {},
      },
      database: {
        queries: 0,
        totalDuration: 0,
        errors: 0,
      },
      tokens: {
        refreshAttempts: 0,
        refreshSuccesses: 0,
        refreshFailures: 0,
        expiringTokens: 0,
      },
      webhooks: {
        received: 0,
        processed: 0,
        failed: 0,
        retried: 0,
      },
    };

    this.startTime = Date.now();
  }

  /**
   * Record HTTP request
   */
  recordHttpRequest(method, path, status, duration) {
    this.metrics.http.requests++;
    this.metrics.http.responses++;
    this.metrics.http.totalDuration += duration;

    if (!this.metrics.http.statusCodes[status]) {
      this.metrics.http.statusCodes[status] = 0;
    }
    this.metrics.http.statusCodes[status]++;

    if (status >= 400) {
      this.metrics.http.errors++;
    }

    logger.debug('HTTP metric recorded', {
      method,
      path,
      status,
      duration,
    });
  }

  /**
   * Record API call
   */
  recordApiCall(endpoint, success, duration, error = null, retries = 0) {
    this.metrics.api.calls++;
    this.metrics.api.totalDuration += duration;

    if (success) {
      this.metrics.api.successes++;
    } else {
      this.metrics.api.failures++;
      if (error) {
        if (!this.metrics.api.errors[error]) {
          this.metrics.api.errors[error] = 0;
        }
        this.metrics.api.errors[error]++;
      }
    }

    if (retries > 0) {
      this.metrics.api.retries += retries;
    }

    logger.debug('API metric recorded', {
      endpoint,
      success,
      duration,
      retries,
    });
  }

  /**
   * Record database query
   */
  recordDatabaseQuery(duration, error = false) {
    this.metrics.database.queries++;
    this.metrics.database.totalDuration += duration;

    if (error) {
      this.metrics.database.errors++;
    }

    logger.debug('Database metric recorded', {
      duration,
      error,
    });
  }

  /**
   * Record token refresh
   */
  recordTokenRefresh(success, expiringCount = 0) {
    this.metrics.tokens.refreshAttempts++;

    if (success) {
      this.metrics.tokens.refreshSuccesses++;
    } else {
      this.metrics.tokens.refreshFailures++;
    }

    if (expiringCount > 0) {
      this.metrics.tokens.expiringTokens += expiringCount;
    }

    logger.info('Token refresh metric recorded', {
      success,
      expiringCount,
    });
  }

  /**
   * Record webhook event
   */
  recordWebhookEvent(status, retried = false) {
    if (status === 'received') {
      this.metrics.webhooks.received++;
    } else if (status === 'processed') {
      this.metrics.webhooks.processed++;
    } else if (status === 'failed') {
      this.metrics.webhooks.failed++;
    }

    if (retried) {
      this.metrics.webhooks.retried++;
    }

    logger.debug('Webhook metric recorded', {
      status,
      retried,
    });
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    const uptime = Date.now() - this.startTime;

    return {
      timestamp: new Date().toISOString(),
      uptime,
      metrics: this.metrics,
      averages: {
        httpDuration: this.metrics.http.requests > 0 ? this.metrics.http.totalDuration / this.metrics.http.requests : 0,
        apiDuration: this.metrics.api.calls > 0 ? this.metrics.api.totalDuration / this.metrics.api.calls : 0,
        dbDuration: this.metrics.database.queries > 0 ? this.metrics.database.totalDuration / this.metrics.database.queries : 0,
      },
    };
  }

  /**
   * Reset metrics
   */
  reset() {
    this.metrics = {
      http: { requests: 0, responses: 0, errors: 0, totalDuration: 0, statusCodes: {} },
      api: { calls: 0, successes: 0, failures: 0, retries: 0, totalDuration: 0, errors: {} },
      database: { queries: 0, totalDuration: 0, errors: 0 },
      tokens: { refreshAttempts: 0, refreshSuccesses: 0, refreshFailures: 0, expiringTokens: 0 },
      webhooks: { received: 0, processed: 0, failed: 0, retried: 0 },
    };
    this.startTime = Date.now();
  }

  /**
   * Log metrics summary
   */
  logSummary() {
    const metrics = this.getMetrics();
    logger.info('Metrics summary', metrics);
  }
}

// Global metrics instance
const metricsCollector = new MetricsCollector();

/**
 * Express middleware for metrics collection
 */
function metricsMiddleware(req, res, next) {
  const startTime = Date.now();

  const originalSend = res.send;
  res.send = function (data) {
    const duration = Date.now() - startTime;
    metricsCollector.recordHttpRequest(req.method, req.path, res.statusCode, duration);
    return originalSend.call(this, data);
  };

  next();
}

module.exports = {
  MetricsCollector,
  metricsCollector,
  metricsMiddleware,
};

