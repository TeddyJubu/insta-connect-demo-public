/**
 * N8N Integration Metrics and Monitoring
 * Tracks metrics for N8N message processing
 */

const { createLogger } = require('./logger');

const logger = createLogger('n8nMetrics');

class N8NMetrics {
  constructor() {
    this.metrics = {
      messagesReceived: 0,
      messagesForwarded: 0,
      messagesProcessed: 0,
      messagesFailed: 0,
      messagesRetried: 0,
      totalResponseTime: 0,
      totalN8NResponseTime: 0,
      n8nErrors: 0,
      instagramErrors: 0,
      deadLetterCount: 0,
      lastReset: new Date(),
    };

    this.timings = [];
    this.errors = [];
  }

  /**
   * Record a message received event
   */
  recordMessageReceived() {
    this.metrics.messagesReceived++;
    logger.debug('Message received', { total: this.metrics.messagesReceived });
  }

  /**
   * Record a message forwarded to N8N event
   */
  recordMessageForwarded() {
    this.metrics.messagesForwarded++;
    logger.debug('Message forwarded to N8N', { total: this.metrics.messagesForwarded });
  }

  /**
   * Record a message processed event
   */
  recordMessageProcessed(responseTime) {
    this.metrics.messagesProcessed++;
    this.metrics.totalResponseTime += responseTime;
    this.timings.push({
      timestamp: new Date(),
      responseTime,
      type: 'processed',
    });

    logger.debug('Message processed', {
      total: this.metrics.messagesProcessed,
      avgResponseTime: this.getAverageResponseTime(),
    });
  }

  /**
   * Record a message failed event
   */
  recordMessageFailed(error) {
    this.metrics.messagesFailed++;
    this.errors.push({
      timestamp: new Date(),
      error,
      type: 'message_failed',
    });

    logger.warn('Message processing failed', {
      total: this.metrics.messagesFailed,
      error,
    });
  }

  /**
   * Record a message retry event
   */
  recordMessageRetried() {
    this.metrics.messagesRetried++;
    logger.debug('Message retried', { total: this.metrics.messagesRetried });
  }

  /**
   * Record N8N response time
   */
  recordN8NResponseTime(responseTime) {
    this.metrics.totalN8NResponseTime += responseTime;
    this.timings.push({
      timestamp: new Date(),
      responseTime,
      type: 'n8n_response',
    });

    logger.debug('N8N response recorded', {
      responseTime,
      avgN8NResponseTime: this.getAverageN8NResponseTime(),
    });
  }

  /**
   * Record N8N error
   */
  recordN8NError(error) {
    this.metrics.n8nErrors++;
    this.errors.push({
      timestamp: new Date(),
      error,
      type: 'n8n_error',
    });

    logger.warn('N8N error occurred', {
      total: this.metrics.n8nErrors,
      error,
    });
  }

  /**
   * Record Instagram error
   */
  recordInstagramError(error) {
    this.metrics.instagramErrors++;
    this.errors.push({
      timestamp: new Date(),
      error,
      type: 'instagram_error',
    });

    logger.warn('Instagram error occurred', {
      total: this.metrics.instagramErrors,
      error,
    });
  }

  /**
   * Record dead letter message
   */
  recordDeadLetter() {
    this.metrics.deadLetterCount++;
    logger.warn('Message moved to dead letter queue', {
      total: this.metrics.deadLetterCount,
    });
  }

  /**
   * Get average response time
   */
  getAverageResponseTime() {
    if (this.metrics.messagesProcessed === 0) return 0;
    return Math.round(this.metrics.totalResponseTime / this.metrics.messagesProcessed);
  }

  /**
   * Get average N8N response time
   */
  getAverageN8NResponseTime() {
    const n8nTimings = this.timings.filter((t) => t.type === 'n8n_response');
    if (n8nTimings.length === 0) return 0;
    const total = n8nTimings.reduce((sum, t) => sum + t.responseTime, 0);
    return Math.round(total / n8nTimings.length);
  }

  /**
   * Get success rate
   */
  getSuccessRate() {
    const total = this.metrics.messagesProcessed + this.metrics.messagesFailed;
    if (total === 0) return 0;
    return Math.round((this.metrics.messagesProcessed / total) * 100);
  }

  /**
   * Get error rate
   */
  getErrorRate() {
    const total = this.metrics.messagesProcessed + this.metrics.messagesFailed;
    if (total === 0) return 0;
    return Math.round((this.metrics.messagesFailed / total) * 100);
  }

  /**
   * Get all metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      averageResponseTime: this.getAverageResponseTime(),
      averageN8NResponseTime: this.getAverageN8NResponseTime(),
      successRate: this.getSuccessRate(),
      errorRate: this.getErrorRate(),
      recentErrors: this.errors.slice(-10),
      recentTimings: this.timings.slice(-10),
    };
  }

  /**
   * Get metrics summary
   */
  getSummary() {
    return {
      messagesReceived: this.metrics.messagesReceived,
      messagesProcessed: this.metrics.messagesProcessed,
      messagesFailed: this.metrics.messagesFailed,
      messagesRetried: this.metrics.messagesRetried,
      deadLetterCount: this.metrics.deadLetterCount,
      successRate: this.getSuccessRate(),
      errorRate: this.getErrorRate(),
      averageResponseTime: this.getAverageResponseTime(),
      averageN8NResponseTime: this.getAverageN8NResponseTime(),
      n8nErrors: this.metrics.n8nErrors,
      instagramErrors: this.metrics.instagramErrors,
    };
  }

  /**
   * Reset metrics
   */
  reset() {
    this.metrics = {
      messagesReceived: 0,
      messagesForwarded: 0,
      messagesProcessed: 0,
      messagesFailed: 0,
      messagesRetried: 0,
      totalResponseTime: 0,
      totalN8NResponseTime: 0,
      n8nErrors: 0,
      instagramErrors: 0,
      deadLetterCount: 0,
      lastReset: new Date(),
    };
    this.timings = [];
    this.errors = [];

    logger.info('N8N metrics reset');
  }

  /**
   * Log metrics summary
   */
  logSummary() {
    const summary = this.getSummary();
    logger.info('N8N Metrics Summary', summary);
    return summary;
  }

  /**
   * Check for alerts
   */
  checkAlerts() {
    const alerts = [];

    // Alert if error rate is too high
    if (this.getErrorRate() > 50) {
      alerts.push({
        level: 'critical',
        message: `High error rate: ${this.getErrorRate()}%`,
        metric: 'errorRate',
      });
    }

    // Alert if too many dead letter messages
    if (this.metrics.deadLetterCount > 10) {
      alerts.push({
        level: 'warning',
        message: `High dead letter count: ${this.metrics.deadLetterCount}`,
        metric: 'deadLetterCount',
      });
    }

    // Alert if N8N errors are high
    if (this.metrics.n8nErrors > 5) {
      alerts.push({
        level: 'warning',
        message: `High N8N error count: ${this.metrics.n8nErrors}`,
        metric: 'n8nErrors',
      });
    }

    // Alert if Instagram errors are high
    if (this.metrics.instagramErrors > 5) {
      alerts.push({
        level: 'warning',
        message: `High Instagram error count: ${this.metrics.instagramErrors}`,
        metric: 'instagramErrors',
      });
    }

    // Alert if response time is too high
    if (this.getAverageResponseTime() > 30000) {
      alerts.push({
        level: 'warning',
        message: `High average response time: ${this.getAverageResponseTime()}ms`,
        metric: 'averageResponseTime',
      });
    }

    if (alerts.length > 0) {
      logger.warn('N8N Alerts', { alerts });
    }

    return alerts;
  }
}

// Export singleton instance
module.exports = new N8NMetrics();

