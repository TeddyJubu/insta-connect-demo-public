const db = require('../db');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

class User {
  /**
   * Create a new user
   * @param {string} email - User email
   * @param {string} password - Plain text password
   * @returns {Promise<Object>} Created user
   */
  static async create(email, password) {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await db.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
      [email, passwordHash],
    );

    return result.rows[0];
  }

  /**
   * Find user by email
   * @param {string} email - User email
   * @returns {Promise<Object|null>} User object or null
   */
  static async findByEmail(email) {
    const result = await db.query(
      'SELECT id, email, password_hash, created_at, updated_at, last_login_at FROM users WHERE email = $1',
      [email],
    );

    return result.rows[0] || null;
  }

  /**
   * Find user by ID
   * @param {number} id - User ID
   * @returns {Promise<Object|null>} User object or null
   */
  static async findById(id) {
    const result = await db.query(
      'SELECT id, email, created_at, updated_at, last_login_at FROM users WHERE id = $1',
      [id],
    );

    return result.rows[0] || null;
  }

  /**
   * Verify user password
   * @param {string} email - User email
   * @param {string} password - Plain text password
   * @returns {Promise<Object|null>} User object if valid, null otherwise
   */
  static async verify(email, password) {
    const user = await this.findByEmail(email);

    if (!user || !user.password_hash) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return null;
    }

    // Update last login time
    await db.query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

    // Return user without password hash
    // eslint-disable-next-line no-unused-vars
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Update user password
   * @param {number} userId - User ID
   * @param {string} newPassword - New plain text password
   * @returns {Promise<boolean>} Success status
   */
  static async updatePassword(userId, newPassword) {
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    const result = await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [
      passwordHash,
      userId,
    ]);

    return result.rowCount > 0;
  }

  /**
   * Delete user and all associated data
   * @param {number} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  static async delete(userId) {
    const result = await db.query('DELETE FROM users WHERE id = $1', [userId]);

    return result.rowCount > 0;
  }
}

module.exports = User;
