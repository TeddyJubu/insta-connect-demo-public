const db = require('../db');

class WebhookEvent {
  /**
   * Create a new webhook event
   * @param {Object} eventData - Webhook event data
   * @returns {Promise<Object>} Created event
   */
  static async create(eventData) {
    const {
      pageId = null,
      eventType,
      payload,
      status = 'pending',
    } = eventData;

    const result = await db.query(
      `INSERT INTO webhook_events (page_id, event_type, payload, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [pageId, eventType, JSON.stringify(payload), status]
    );

    return result.rows[0];
  }

  /**
   * Find event by ID
   * @param {number} id - Event ID
   * @returns {Promise<Object|null>} Event or null
   */
  static async findById(id) {
    const result = await db.query(
      'SELECT * FROM webhook_events WHERE id = $1',
      [id]
    );

    return result.rows[0] || null;
  }

  /**
   * Find events by page ID
   * @param {number} pageId - Page database ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of events
   */
  static async findByPageId(pageId, options = {}) {
    const {
      status = null,
      limit = 100,
      offset = 0,
    } = options;

    let query = 'SELECT * FROM webhook_events WHERE page_id = $1';
    const params = [pageId];

    if (status) {
      query += ' AND status = $2';
      params.push(status);
    }

    query += ' ORDER BY received_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Find all events with pagination and filtering
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Object with events and total count
   */
  static async findAll(options = {}) {
    const {
      status = null,
      eventType = null,
      limit = 100,
      offset = 0,
    } = options;

    let query = 'SELECT * FROM webhook_events WHERE 1=1';
    const params = [];

    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    if (eventType) {
      params.push(eventType);
      query += ` AND event_type = $${params.length}`;
    }

    // Get total count
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated results
    query += ` ORDER BY received_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    return {
      events: result.rows,
      total,
      limit,
      offset,
    };
  }

  /**
   * Find pending events for processing
   * @param {number} limit - Maximum number of events to return
   * @returns {Promise<Array>} Array of pending events
   */
  static async findPending(limit = 10) {
    const result = await db.query(
      `SELECT * FROM webhook_events 
       WHERE status = 'pending' 
       ORDER BY received_at ASC 
       LIMIT $1`,
      [limit]
    );

    return result.rows;
  }

  /**
   * Find failed events that should be retried
   * @param {number} maxRetries - Maximum retry count
   * @param {number} limit - Maximum number of events to return
   * @returns {Promise<Array>} Array of failed events
   */
  static async findRetryable(maxRetries = 3, limit = 10) {
    const result = await db.query(
      `SELECT * FROM webhook_events 
       WHERE status = 'failed' 
       AND retry_count < $1
       ORDER BY received_at ASC 
       LIMIT $2`,
      [maxRetries, limit]
    );

    return result.rows;
  }

  /**
   * Update event status
   * @param {number} id - Event ID
   * @param {string} status - New status (pending, processing, processed, failed, dead_letter)
   * @param {Object} options - Additional update options
   * @returns {Promise<Object>} Updated event
   */
  static async updateStatus(id, status, options = {}) {
    const {
      error = null,
      incrementRetry = false,
    } = options;

    let query = 'UPDATE webhook_events SET status = $1';
    const params = [status, id];
    let paramIndex = 2;

    if (status === 'processed') {
      query += ', processed_at = CURRENT_TIMESTAMP';
    }

    if (error) {
      paramIndex++;
      query += `, last_error = $${paramIndex}`;
      params.splice(paramIndex - 1, 0, error);
    }

    if (incrementRetry) {
      query += ', retry_count = retry_count + 1';
    }

    query += ` WHERE id = $2 RETURNING *`;

    const result = await db.query(query, params);
    return result.rows[0];
  }

  /**
   * Mark event as processing
   * @param {number} id - Event ID
   * @returns {Promise<Object>} Updated event
   */
  static async markProcessing(id) {
    return this.updateStatus(id, 'processing');
  }

  /**
   * Mark event as processed
   * @param {number} id - Event ID
   * @returns {Promise<Object>} Updated event
   */
  static async markProcessed(id) {
    return this.updateStatus(id, 'processed');
  }

  /**
   * Mark event as failed
   * @param {number} id - Event ID
   * @param {string} error - Error message
   * @param {boolean} incrementRetry - Whether to increment retry count
   * @returns {Promise<Object>} Updated event
   */
  static async markFailed(id, error, incrementRetry = true) {
    return this.updateStatus(id, 'failed', { error, incrementRetry });
  }

  /**
   * Move event to dead letter queue
   * @param {number} id - Event ID
   * @param {string} error - Final error message
   * @returns {Promise<Object>} Updated event
   */
  static async moveToDeadLetter(id, error) {
    return this.updateStatus(id, 'dead_letter', { error });
  }

  /**
   * Retry a failed event
   * @param {number} id - Event ID
   * @returns {Promise<Object>} Updated event
   */
  static async retry(id) {
    const result = await db.query(
      `UPDATE webhook_events 
       SET status = 'pending', last_error = NULL 
       WHERE id = $1 
       RETURNING *`,
      [id]
    );

    return result.rows[0];
  }

  /**
   * Delete old processed events
   * @param {number} daysOld - Delete events older than this many days
   * @returns {Promise<number>} Number of deleted events
   */
  static async deleteOldProcessed(daysOld = 30) {
    const result = await db.query(
      `DELETE FROM webhook_events 
       WHERE status = 'processed' 
       AND processed_at < CURRENT_TIMESTAMP - INTERVAL '${daysOld} days'`,
      []
    );

    return result.rowCount;
  }

  /**
   * Get event statistics
   * @returns {Promise<Object>} Statistics object
   */
  static async getStats() {
    const result = await db.query(
      `SELECT 
        status,
        COUNT(*) as count,
        MAX(received_at) as last_received
       FROM webhook_events
       GROUP BY status`,
      []
    );

    const stats = {
      total: 0,
      pending: 0,
      processing: 0,
      processed: 0,
      failed: 0,
      dead_letter: 0,
      last_received: null,
    };

    result.rows.forEach(row => {
      stats[row.status] = parseInt(row.count);
      stats.total += parseInt(row.count);
      
      if (row.last_received && (!stats.last_received || row.last_received > stats.last_received)) {
        stats.last_received = row.last_received;
      }
    });

    return stats;
  }
}

module.exports = WebhookEvent;

