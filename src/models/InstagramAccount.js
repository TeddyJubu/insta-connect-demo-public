const db = require('../db');

class InstagramAccount {
  /**
   * Create or update an Instagram account
   * @param {Object} accountData - Instagram account data
   * @returns {Promise<Object>} Created/updated account
   */
  static async upsert(accountData) {
    const { pageId, instagramId, username } = accountData;

    const result = await db.query(
      `INSERT INTO instagram_accounts (page_id, instagram_id, username)
       VALUES ($1, $2, $3)
       ON CONFLICT (instagram_id)
       DO UPDATE SET
         username = EXCLUDED.username,
         page_id = EXCLUDED.page_id
       RETURNING *`,
      [pageId, instagramId, username],
    );

    return result.rows[0];
  }

  /**
   * Find Instagram account by page ID
   * @param {number} pageId - Page database ID
   * @returns {Promise<Object|null>} Instagram account or null
   */
  static async findByPageId(pageId) {
    const result = await db.query('SELECT * FROM instagram_accounts WHERE page_id = $1', [pageId]);

    return result.rows[0] || null;
  }

  /**
   * Find Instagram account by Instagram ID
   * @param {string} instagramId - Instagram business account ID
   * @returns {Promise<Object|null>} Instagram account or null
   */
  static async findByInstagramId(instagramId) {
    const result = await db.query('SELECT * FROM instagram_accounts WHERE instagram_id = $1', [
      instagramId,
    ]);

    return result.rows[0] || null;
  }

  /**
   * Delete Instagram account
   * @param {number} id - Instagram account database ID
   * @returns {Promise<boolean>} Success status
   */
  static async delete(id) {
    const result = await db.query('DELETE FROM instagram_accounts WHERE id = $1', [id]);

    return result.rowCount > 0;
  }
}

module.exports = InstagramAccount;
