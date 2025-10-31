const db = require('../db');

class MetaAccount {
  /**
   * Create or update a Meta account
   * @param {Object} accountData - Meta account data
   * @returns {Promise<Object>} Created/updated account
   */
  static async upsert(accountData) {
    const {
      userId,
      metaUserId,
      accessToken,
      tokenType = 'long_lived',
      expiresAt,
      scopes,
    } = accountData;

    const result = await db.query(
      `INSERT INTO meta_accounts (user_id, meta_user_id, access_token, token_type, expires_at, scopes)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, meta_user_id)
       DO UPDATE SET
         access_token = EXCLUDED.access_token,
         token_type = EXCLUDED.token_type,
         expires_at = EXCLUDED.expires_at,
         scopes = EXCLUDED.scopes
       RETURNING *`,
      [userId, metaUserId, accessToken, tokenType, expiresAt, scopes]
    );

    return result.rows[0];
  }

  /**
   * Find Meta account by user ID
   * @param {number} userId - User ID
   * @returns {Promise<Object|null>} Meta account or null
   */
  static async findByUserId(userId) {
    const result = await db.query(
      'SELECT * FROM meta_accounts WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );

    return result.rows[0] || null;
  }

  /**
   * Find Meta account by ID
   * @param {number} id - Meta account database ID
   * @returns {Promise<Object|null>} Meta account or null
   */
  static async findById(id) {
    const result = await db.query(
      'SELECT * FROM meta_accounts WHERE id = $1',
      [id]
    );

    return result.rows[0] || null;
  }

  /**
   * Update access token
   * @param {number} accountId - Meta account database ID
   * @param {string} newToken - New access token
   * @param {Date} expiresAt - Token expiration date
   * @returns {Promise<Object>} Updated account
   */
  static async updateToken(accountId, newToken, expiresAt) {
    const result = await db.query(
      'UPDATE meta_accounts SET access_token = $1, expires_at = $2 WHERE id = $3 RETURNING *',
      [newToken, expiresAt, accountId]
    );

    return result.rows[0];
  }

  /**
   * Get accounts with expiring tokens (within specified days)
   * @param {number} daysUntilExpiry - Number of days until expiry
   * @returns {Promise<Array>} Array of accounts with expiring tokens
   */
  static async findExpiringTokens(daysUntilExpiry = 7) {
    const result = await db.query(
      `SELECT * FROM meta_accounts
       WHERE expires_at IS NOT NULL
       AND expires_at <= CURRENT_TIMESTAMP + INTERVAL '${daysUntilExpiry} days'
       AND expires_at > CURRENT_TIMESTAMP
       ORDER BY expires_at ASC`,
      []
    );

    return result.rows;
  }

  /**
   * Delete Meta account
   * @param {number} accountId - Meta account database ID
   * @returns {Promise<boolean>} Success status
   */
  static async delete(accountId) {
    const result = await db.query(
      'DELETE FROM meta_accounts WHERE id = $1',
      [accountId]
    );

    return result.rowCount > 0;
  }
}

module.exports = MetaAccount;

