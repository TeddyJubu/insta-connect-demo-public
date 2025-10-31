const db = require('../db');

class Page {
  /**
   * Create or update a page
   * @param {Object} pageData - Page data
   * @returns {Promise<Object>} Created/updated page
   */
  static async upsert(pageData) {
    const {
      userId,
      metaAccountId,
      pageId,
      pageName,
      pageAccessToken,
      tokenExpiresAt,
      isSelected = false,
    } = pageData;

    const result = await db.query(
      `INSERT INTO pages (user_id, meta_account_id, page_id, page_name, page_access_token, token_expires_at, is_selected)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id, page_id)
       DO UPDATE SET
         page_name = EXCLUDED.page_name,
         page_access_token = EXCLUDED.page_access_token,
         token_expires_at = EXCLUDED.token_expires_at,
         is_selected = EXCLUDED.is_selected,
         meta_account_id = EXCLUDED.meta_account_id
       RETURNING *`,
      [userId, metaAccountId, pageId, pageName, pageAccessToken, tokenExpiresAt, isSelected]
    );

    return result.rows[0];
  }

  /**
   * Find pages by user ID
   * @param {number} userId - User ID
   * @returns {Promise<Array>} Array of pages
   */
  static async findByUserId(userId) {
    const result = await db.query(
      'SELECT * FROM pages WHERE user_id = $1 ORDER BY is_selected DESC, created_at DESC',
      [userId]
    );

    return result.rows;
  }

  /**
   * Find selected page for user
   * @param {number} userId - User ID
   * @returns {Promise<Object|null>} Selected page or null
   */
  static async findSelectedByUserId(userId) {
    const result = await db.query(
      'SELECT * FROM pages WHERE user_id = $1 AND is_selected = true LIMIT 1',
      [userId]
    );

    return result.rows[0] || null;
  }

  /**
   * Find page by ID
   * @param {number} id - Page database ID
   * @returns {Promise<Object|null>} Page object or null
   */
  static async findById(id) {
    const result = await db.query(
      'SELECT * FROM pages WHERE id = $1',
      [id]
    );

    return result.rows[0] || null;
  }

  /**
   * Find page by user ID and page ID
   * @param {number} userId - User ID
   * @param {string} pageId - Meta page ID
   * @returns {Promise<Object|null>} Page object or null
   */
  static async findByUserAndPageId(userId, pageId) {
    const result = await db.query(
      'SELECT * FROM pages WHERE user_id = $1 AND page_id = $2',
      [userId, pageId]
    );

    return result.rows[0] || null;
  }

  /**
   * Set selected page for user (unselects others)
   * @param {number} userId - User ID
   * @param {number} pageDbId - Page database ID
   * @returns {Promise<Object>} Updated page
   */
  static async setSelected(userId, pageDbId) {
    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      // Unselect all pages for this user
      await client.query(
        'UPDATE pages SET is_selected = false WHERE user_id = $1',
        [userId]
      );

      // Select the specified page
      const result = await client.query(
        'UPDATE pages SET is_selected = true WHERE id = $1 AND user_id = $2 RETURNING *',
        [pageDbId, userId]
      );

      await client.query('COMMIT');

      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update page access token
   * @param {number} pageDbId - Page database ID
   * @param {string} newToken - New access token
   * @param {Date} expiresAt - Token expiration date
   * @returns {Promise<Object>} Updated page
   */
  static async updateToken(pageDbId, newToken, expiresAt) {
    const result = await db.query(
      'UPDATE pages SET page_access_token = $1, token_expires_at = $2 WHERE id = $3 RETURNING *',
      [newToken, expiresAt, pageDbId]
    );

    return result.rows[0];
  }

  /**
   * Delete page
   * @param {number} pageDbId - Page database ID
   * @returns {Promise<boolean>} Success status
   */
  static async delete(pageDbId) {
    const result = await db.query(
      'DELETE FROM pages WHERE id = $1',
      [pageDbId]
    );

    return result.rowCount > 0;
  }

  /**
   * Get pages with expiring tokens (within specified days)
   * @param {number} daysUntilExpiry - Number of days until expiry
   * @returns {Promise<Array>} Array of pages with expiring tokens
   */
  static async findExpiringTokens(daysUntilExpiry = 7) {
    const result = await db.query(
      `SELECT * FROM pages
       WHERE token_expires_at IS NOT NULL
       AND token_expires_at <= CURRENT_TIMESTAMP + INTERVAL '${daysUntilExpiry} days'
       AND token_expires_at > CURRENT_TIMESTAMP
       ORDER BY token_expires_at ASC`,
      []
    );

    return result.rows;
  }
}

module.exports = Page;

