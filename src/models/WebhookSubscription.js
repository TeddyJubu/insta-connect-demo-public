const db = require('../db');

class WebhookSubscription {
  /**
   * Create a webhook subscription
   * @param {number} pageId - Page database ID
   * @param {string} field - Webhook field name
   * @returns {Promise<Object>} Created subscription
   */
  static async create(pageId, field) {
    const result = await db.query(
      `INSERT INTO webhook_subscriptions (page_id, field)
       VALUES ($1, $2)
       ON CONFLICT (page_id, field) DO NOTHING
       RETURNING *`,
      [pageId, field],
    );

    return result.rows[0];
  }

  /**
   * Find subscriptions by page ID
   * @param {number} pageId - Page database ID
   * @returns {Promise<Array>} Array of subscriptions
   */
  static async findByPageId(pageId) {
    const result = await db.query(
      'SELECT * FROM webhook_subscriptions WHERE page_id = $1 ORDER BY subscribed_at DESC',
      [pageId],
    );

    return result.rows;
  }

  /**
   * Delete a webhook subscription
   * @param {number} pageId - Page database ID
   * @param {string} field - Webhook field name
   * @returns {Promise<boolean>} Success status
   */
  static async delete(pageId, field) {
    const result = await db.query(
      'DELETE FROM webhook_subscriptions WHERE page_id = $1 AND field = $2',
      [pageId, field],
    );

    return result.rowCount > 0;
  }

  /**
   * Get all subscribed fields for a page
   * @param {number} pageId - Page database ID
   * @returns {Promise<Array<string>>} Array of field names
   */
  static async getFieldsByPageId(pageId) {
    const result = await db.query('SELECT field FROM webhook_subscriptions WHERE page_id = $1', [
      pageId,
    ]);

    return result.rows.map((row) => row.field);
  }
}

module.exports = WebhookSubscription;
