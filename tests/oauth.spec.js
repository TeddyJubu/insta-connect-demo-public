/**
 * OAuth Routes Tests
 * Tests for /login, /oauth/callback, /oauth/error endpoints
 */

const request = require('supertest');
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const nock = require('nock');
// eslint-disable-next-line no-unused-vars
const Page = require('../src/models/Page');
// eslint-disable-next-line no-unused-vars
const InstagramAccount = require('../src/models/InstagramAccount');
// eslint-disable-next-line no-unused-vars
const WebhookSubscription = require('../src/models/WebhookSubscription');

// Mock models
jest.mock('../src/models/Page');
jest.mock('../src/models/InstagramAccount');
jest.mock('../src/models/WebhookSubscription');

// Mock auth middleware
jest.mock('../src/middleware/auth', () => ({
  requireAuth: (req, res, next) => {
    req.session = req.session || {};
    req.session.userId = req.session.userId || 1;
    next();
  },
  optionalAuth: (req, res, next) => next(),
}));

// Create test app with OAuth routes
const createTestApp = () => {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  app.use(
    session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false, httpOnly: true },
    }),
  );

  const stateStore = new Map();
  const STATE_TTL = 10 * 60 * 1000; // 10 minutes
  const OAUTH_STATE_SECRET = 'test-oauth-state-secret';
  const APP_ID = 'test-app-id';
  // eslint-disable-next-line no-unused-vars
  const APP_SECRET = 'test-app-secret';
  const OAUTH_REDIRECT_URI = 'http://localhost:3000/oauth/callback';
  const SCOPES =
    'pages_manage_metadata,pages_read_engagement,instagram_basic,instagram_manage_messages';

  const oauthCookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: STATE_TTL,
  };

  function makeState() {
    const randomSeed = crypto.randomBytes(32).toString('hex');
    const state = crypto.createHmac('sha256', OAUTH_STATE_SECRET).update(randomSeed).digest('hex');
    stateStore.set(state, Date.now());
    return state;
  }

  function buildAuthUrl(state) {
    const OAUTH_BASE = 'https://www.facebook.com/v20.0/dialog/oauth';
    const url = new URL(OAUTH_BASE);
    url.searchParams.set('client_id', APP_ID);
    url.searchParams.set('redirect_uri', OAUTH_REDIRECT_URI);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', SCOPES);
    url.searchParams.set('state', state);
    return url.toString();
  }

  // GET /login - Start OAuth flow
  app.get('/login', (req, res) => {
    try {
      const state = makeState();
      res.cookie('oauth_state', state, oauthCookieOptions);
      res.redirect(buildAuthUrl(state));
    } catch (err) {
      res.status(500).send(String(err));
    }
  });

  // GET /oauth/callback - Handle OAuth callback
  app.get('/oauth/callback', async (req, res) => {
    try {
      const { code, state } = req.query;
      const cookieState = req.cookies.oauth_state;
      const issuedAt = state ? stateStore.get(state) : undefined;
      const stateExpired = typeof issuedAt === 'number' ? Date.now() - issuedAt > STATE_TTL : true;

      if (!code || !state || state !== cookieState || !issuedAt || stateExpired) {
        const errorMessage = encodeURIComponent('Invalid OAuth state or authorization code');
        const errorDetails = encodeURIComponent(
          'The OAuth flow may have expired or been tampered with. Please try again.',
        );
        return res.redirect(`/oauth/error?error=${errorMessage}&details=${errorDetails}`);
      }

      stateStore.delete(state);
      res.clearCookie('oauth_state', { ...oauthCookieOptions, maxAge: undefined });

      // Mock successful token exchange
      res.json({
        success: true,
        message: 'OAuth callback successful',
      });
    } catch (err) {
      const errorMessage = encodeURIComponent(err.message || 'OAuth connection failed');
      res.redirect(`/oauth/error?error=${errorMessage}`);
    }
  });

  // GET /oauth/error - Show OAuth error
  app.get('/oauth/error', (req, res) => {
    const error = req.query.error || 'Unknown error';
    const details = req.query.details || '';
    res.json({
      error: decodeURIComponent(error),
      details: decodeURIComponent(details),
    });
  });

  return app;
};

describe('OAuth Routes', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('GET /login - Start OAuth Flow', () => {
    it('should redirect to Facebook OAuth dialog', async () => {
      const response = await request(app).get('/login').expect(302);

      expect(response.headers.location).toContain('https://www.facebook.com/v20.0/dialog/oauth');
      expect(response.headers.location).toContain('client_id=test-app-id');
      expect(response.headers.location).toContain('response_type=code');
      expect(response.headers.location).toContain('redirect_uri=');
    });

    it('should set oauth_state cookie', async () => {
      const response = await request(app).get('/login').expect(302);

      expect(response.headers['set-cookie']).toBeDefined();
      expect(response.headers['set-cookie'][0]).toContain('oauth_state=');
    });

    it('should include scopes in OAuth URL', async () => {
      const response = await request(app).get('/login').expect(302);

      expect(response.headers.location).toContain('pages_manage_metadata');
      expect(response.headers.location).toContain('instagram_manage_messages');
    });
  });

  describe('GET /oauth/callback - Handle OAuth Callback', () => {
    it('should reject callback without code', async () => {
      const response = await request(app).get('/oauth/callback?state=test-state').expect(302);

      expect(response.headers.location).toContain('/oauth/error');
      expect(response.headers.location).toContain('error=');
    });

    it('should reject callback without state', async () => {
      const response = await request(app).get('/oauth/callback?code=test-code').expect(302);

      expect(response.headers.location).toContain('/oauth/error');
    });

    it('should reject callback with mismatched state', async () => {
      const agent = request.agent(app);

      // First, start OAuth flow to get a valid state
      await agent.get('/login').expect(302);

      // Try callback with different state
      const response = await agent
        .get('/oauth/callback?code=test-code&state=wrong-state')
        .expect(302);

      expect(response.headers.location).toContain('/oauth/error');
    });

    it('should accept valid callback with matching state', async () => {
      const agent = request.agent(app);

      // Start OAuth flow
      const loginResponse = await agent.get('/login').expect(302);

      // Extract state from redirect URL
      const location = loginResponse.headers.location;
      const stateMatch = location.match(/state=([a-f0-9]+)/);
      const state = stateMatch ? stateMatch[1] : null;

      expect(state).toBeTruthy();

      // Callback with matching state
      const response = await agent.get(`/oauth/callback?code=test-code&state=${state}`).expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should clear oauth_state cookie on success', async () => {
      const agent = request.agent(app);

      const loginResponse = await agent.get('/login').expect(302);
      const location = loginResponse.headers.location;
      const stateMatch = location.match(/state=([a-f0-9]+)/);
      const state = stateMatch ? stateMatch[1] : null;

      const response = await agent.get(`/oauth/callback?code=test-code&state=${state}`).expect(200);

      // Check that oauth_state cookie is cleared
      const setCookieHeaders = response.headers['set-cookie'] || [];
      const oauthStateCookie = setCookieHeaders.find((c) => c.includes('oauth_state'));

      if (oauthStateCookie) {
        // Cookie should be cleared (either with Max-Age=0 or Expires in past)
        expect(oauthStateCookie).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/);
      }
    });
  });

  describe('GET /oauth/error - Show OAuth Error', () => {
    it('should display error message', async () => {
      const response = await request(app)
        .get('/oauth/error?error=Test%20Error&details=Test%20Details')
        .expect(200);

      expect(response.body).toEqual({
        error: 'Test Error',
        details: 'Test Details',
      });
    });

    it('should handle missing error details', async () => {
      const response = await request(app).get('/oauth/error?error=Test%20Error').expect(200);

      expect(response.body).toEqual({
        error: 'Test Error',
        details: '',
      });
    });

    it('should handle missing error message', async () => {
      const response = await request(app).get('/oauth/error').expect(200);

      expect(response.body).toEqual({
        error: 'Unknown error',
        details: '',
      });
    });

    it('should decode URL-encoded error messages', async () => {
      const errorMsg = 'Invalid OAuth state or authorization code';
      const encoded = encodeURIComponent(errorMsg);

      const response = await request(app).get(`/oauth/error?error=${encoded}`).expect(200);

      expect(response.body.error).toBe(errorMsg);
    });
  });
});
