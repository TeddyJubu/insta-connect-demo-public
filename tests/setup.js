/**
 * Jest Setup File
 *
 * Configure test environment and global test utilities
 */

// Suppress console output during tests (optional)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
// };

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/insta_connect_test';
process.env.SESSION_SECRET = 'test-session-secret-change-me';
process.env.APP_ID = 'test-app-id';
process.env.APP_SECRET = 'test-app-secret';
process.env.OAUTH_REDIRECT_URI = 'http://localhost:3000/oauth/callback';
process.env.VERIFY_TOKEN = 'test-verify-token';
process.env.OAUTH_STATE_SECRET = 'test-oauth-state-secret';

// Increase timeout for database operations
jest.setTimeout(10000);
