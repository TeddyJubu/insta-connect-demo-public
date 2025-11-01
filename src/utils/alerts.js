/**
 * Operational Alerts Configuration
 *
 * Monitors and alerts on:
 * - Token refresh failures
 * - Webhook processing errors
 * - High API latency
 * - Database connection issues
 * - Error rate thresholds
 */

const { logger } = require('./winstonLogger');

/**
 * Alert thresholds
 */
const ALERT_THRESHOLDS = {
  TOKEN_REFRESH_FAILURE_RATE: 0.1, // 10% failure rate
  WEBHOOK_ERROR_RATE: 0.05, // 5% error rate
  API_LATENCY_MS: 5000, // 5 seconds
  DB_LATENCY_MS: 1000, // 1 second
  ERROR_RATE: 0.05, // 5% error rate
  CONSECUTIVE_FAILURES: 3, // 3 consecutive failures
};

/**
 * Alert levels
 */
const ALERT_LEVELS = {
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'critical',
};

/**
 * Alert manager
 */
class AlertManager {
  constructor() {
    this.alerts = [];
    this.alertHistory = [];
    this.consecutiveFailures = {
      tokenRefresh: 0,
      webhooks: 0,
      api: 0,
      database: 0,
    };
  }

  /**
   * Create and log alert
   */
  createAlert(level, title, message, context = {}) {
    const alert = {
      timestamp: new Date().toISOString(),
      level,
      title,
      message,
      context,
    };

    this.alerts.push(alert);
    this.alertHistory.push(alert);

    // Keep only last 1000 alerts
    if (this.alertHistory.length > 1000) {
      this.alertHistory.shift();
    }

    // Log alert
    const logLevel = level === ALERT_LEVELS.CRITICAL ? 'error' : 'warn';
    logger[logLevel](`ALERT: ${title}`, {
      level,
      message,
      ...context,
    });

    return alert;
  }

  /**
   * Check token refresh health
   */
  checkTokenRefreshHealth(successCount, failureCount) {
    const total = successCount + failureCount;
    if (total === 0) return;

    const failureRate = failureCount / total;

    if (failureRate > ALERT_THRESHOLDS.TOKEN_REFRESH_FAILURE_RATE) {
      this.consecutiveFailures.tokenRefresh++;

      if (this.consecutiveFailures.tokenRefresh >= ALERT_THRESHOLDS.CONSECUTIVE_FAILURES) {
        this.createAlert(
          ALERT_LEVELS.CRITICAL,
          'Token Refresh Failures',
          `Token refresh failure rate is ${(failureRate * 100).toFixed(2)}%`,
          {
            successCount,
            failureCount,
            failureRate,
          }
        );
      }
    } else {
      this.consecutiveFailures.tokenRefresh = 0;
    }
  }

  /**
   * Check webhook health
   */
  checkWebhookHealth(processedCount, failedCount) {
    const total = processedCount + failedCount;
    if (total === 0) return;

    const errorRate = failedCount / total;

    if (errorRate > ALERT_THRESHOLDS.WEBHOOK_ERROR_RATE) {
      this.consecutiveFailures.webhooks++;

      if (this.consecutiveFailures.webhooks >= ALERT_THRESHOLDS.CONSECUTIVE_FAILURES) {
        this.createAlert(
          ALERT_LEVELS.WARNING,
          'Webhook Processing Errors',
          `Webhook error rate is ${(errorRate * 100).toFixed(2)}%`,
          {
            processedCount,
            failedCount,
            errorRate,
          }
        );
      }
    } else {
      this.consecutiveFailures.webhooks = 0;
    }
  }

  /**
   * Check API latency
   */
  checkApiLatency(averageLatency) {
    if (averageLatency > ALERT_THRESHOLDS.API_LATENCY_MS) {
      this.consecutiveFailures.api++;

      if (this.consecutiveFailures.api >= ALERT_THRESHOLDS.CONSECUTIVE_FAILURES) {
        this.createAlert(
          ALERT_LEVELS.WARNING,
          'High API Latency',
          `Average API latency is ${averageLatency.toFixed(0)}ms`,
          {
            averageLatency,
            threshold: ALERT_THRESHOLDS.API_LATENCY_MS,
          }
        );
      }
    } else {
      this.consecutiveFailures.api = 0;
    }
  }

  /**
   * Check database latency
   */
  checkDatabaseLatency(averageLatency) {
    if (averageLatency > ALERT_THRESHOLDS.DB_LATENCY_MS) {
      this.consecutiveFailures.database++;

      if (this.consecutiveFailures.database >= ALERT_THRESHOLDS.CONSECUTIVE_FAILURES) {
        this.createAlert(
          ALERT_LEVELS.WARNING,
          'High Database Latency',
          `Average database latency is ${averageLatency.toFixed(0)}ms`,
          {
            averageLatency,
            threshold: ALERT_THRESHOLDS.DB_LATENCY_MS,
          }
        );
      }
    } else {
      this.consecutiveFailures.database = 0;
    }
  }

  /**
   * Get active alerts
   */
  getActiveAlerts() {
    return this.alerts;
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit = 100) {
    return this.alertHistory.slice(-limit);
  }

  /**
   * Clear alerts
   */
  clearAlerts() {
    this.alerts = [];
  }

  /**
   * Get alert summary
   */
  getSummary() {
    const critical = this.alerts.filter((a) => a.level === ALERT_LEVELS.CRITICAL).length;
    const warning = this.alerts.filter((a) => a.level === ALERT_LEVELS.WARNING).length;
    const info = this.alerts.filter((a) => a.level === ALERT_LEVELS.INFO).length;

    return {
      timestamp: new Date().toISOString(),
      totalAlerts: this.alerts.length,
      critical,
      warning,
      info,
      alerts: this.alerts,
    };
  }
}

// Global alert manager instance
const alertManager = new AlertManager();

module.exports = {
  AlertManager,
  alertManager,
  ALERT_LEVELS,
  ALERT_THRESHOLDS,
};

