const db = require('../db');
const { createLogger } = require('../utils/logger');

const logger = createLogger('MessageQueue');

class MessageQueue {
  /**
   * Create a new message in the processing queue
   * @param {Object} messageData - Message data
   * @returns {Promise<Object>} Created message
   */
  static async create(messageData) {
    const {
      webhookEventId,
      pageId,
      instagramId,
      senderId,
      recipientId,
      messageText,
      messageId,
    } = messageData;

    const result = await db.query(
      `INSERT INTO message_processing_queue 
       (webhook_event_id, page_id, instagram_id, sender_id, recipient_id, message_text, message_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
       RETURNING *`,
      [webhookEventId, pageId, instagramId, senderId, recipientId, messageText, messageId],
    );

    return result.rows[0];
  }

  /**
   * Find message by ID
   * @param {number} id - Message ID
   * @returns {Promise<Object|null>} Message or null
   */
  static async findById(id) {
    const result = await db.query(
      'SELECT * FROM message_processing_queue WHERE id = $1',
      [id],
    );
    return result.rows[0] || null;
  }

  /**
   * Find message by message_id
   * @param {string} messageId - Instagram message ID
   * @returns {Promise<Object|null>} Message or null
   */
  static async findByMessageId(messageId) {
    const result = await db.query(
      'SELECT * FROM message_processing_queue WHERE message_id = $1',
      [messageId],
    );
    return result.rows[0] || null;
  }

  /**
   * Find messages by status
   * @param {string} status - Message status
   * @param {Object} options - Query options (limit, offset)
   * @returns {Promise<Array>} Messages
   */
  static async findByStatus(status, options = {}) {
    const { limit = 50, offset = 0 } = options;

    const result = await db.query(
      `SELECT * FROM message_processing_queue 
       WHERE status = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [status, limit, offset],
    );

    return result.rows;
  }

  /**
   * Find messages by page ID
   * @param {number} pageId - Page ID
   * @param {Object} options - Query options (status, limit, offset)
   * @returns {Promise<Array>} Messages
   */
  static async findByPageId(pageId, options = {}) {
    const { status = null, limit = 50, offset = 0 } = options;

    let query = 'SELECT * FROM message_processing_queue WHERE page_id = $1';
    const params = [pageId];

    if (status) {
      query += ` AND status = $${params.length + 1}`;
      params.push(status);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Update message status
   * @param {number} id - Message ID
   * @param {string} status - New status
   * @param {Object} updates - Additional fields to update
   * @returns {Promise<Object>} Updated message
   */
  static async updateStatus(id, status, updates = {}) {
    const fields = ['status = $2'];
    const params = [id, status];
    let paramIndex = 3;

    // Add additional fields
    if (updates.aiResponse) {
      fields.push(`ai_response = $${paramIndex}`);
      params.push(updates.aiResponse);
      paramIndex++;
    }

    if (updates.n8nExecutionId) {
      fields.push(`n8n_execution_id = $${paramIndex}`);
      params.push(updates.n8nExecutionId);
      paramIndex++;
    }

    if (updates.lastError) {
      fields.push(`last_error = $${paramIndex}`);
      params.push(updates.lastError);
      paramIndex++;
    }

    if (updates.sentToN8nAt) {
      fields.push(`sent_to_n8n_at = $${paramIndex}`);
      params.push(updates.sentToN8nAt);
      paramIndex++;
    }

    if (updates.receivedFromN8nAt) {
      fields.push(`received_from_n8n_at = $${paramIndex}`);
      params.push(updates.receivedFromN8nAt);
      paramIndex++;
    }

    if (updates.sentToInstagramAt) {
      fields.push(`sent_to_instagram_at = $${paramIndex}`);
      params.push(updates.sentToInstagramAt);
      paramIndex++;
    }

    const result = await db.query(
      `UPDATE message_processing_queue 
       SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      params,
    );

    return result.rows[0];
  }

  /**
   * Increment retry count
   * @param {number} id - Message ID
   * @param {string} error - Error message
   * @returns {Promise<Object>} Updated message
   */
  static async incrementRetry(id, error = null) {
    const result = await db.query(
      `UPDATE message_processing_queue 
       SET retry_count = retry_count + 1,
           last_error = $2,
           last_retry_at = CURRENT_TIMESTAMP,
           next_retry_at = CURRENT_TIMESTAMP + INTERVAL '1 minute' * POWER(2, retry_count),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id, error],
    );

    return result.rows[0];
  }

  /**
   * Get messages ready for retry
   * @returns {Promise<Array>} Messages ready for retry
   */
  static async getReadyForRetry() {
    const result = await db.query(
      `SELECT * FROM message_processing_queue 
       WHERE status IN ('pending', 'failed')
       AND retry_count < max_retries
       AND (next_retry_at IS NULL OR next_retry_at <= CURRENT_TIMESTAMP)
       ORDER BY next_retry_at ASC
       LIMIT 100`,
    );

    return result.rows;
  }

  /**
   * Get queue statistics
   * @returns {Promise<Object>} Queue statistics
   */
  static async getStats() {
    const result = await db.query(
      `SELECT 
         COUNT(*) as total,
         SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
         SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
         SUM(CASE WHEN status = 'ready_to_send' THEN 1 ELSE 0 END) as ready_to_send,
         SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
         SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
         SUM(CASE WHEN status = 'dead_letter' THEN 1 ELSE 0 END) as dead_letter,
         MAX(created_at) as last_created
       FROM message_processing_queue`,
    );

    return result.rows[0];
  }

  /**
   * Delete old messages (cleanup)
   * @param {number} daysOld - Delete messages older than this many days
   * @returns {Promise<number>} Number of deleted messages
   */
  static async deleteOlderThan(daysOld = 30) {
    const result = await db.query(
      `DELETE FROM message_processing_queue 
       WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 day' * $1
       AND status IN ('sent', 'dead_letter')`,
      [daysOld],
    );

    return result.rowCount;
  }
}

module.exports = MessageQueue;

