/**
 * Webhook Routes Tests
 * Tests for /webhook endpoint with signature validation
 */

const request = require('supertest');
const express = require('express');
const crypto = require('crypto');
const { validateWebhookSignature } = require('../src/middleware/webhookValidation');
const WebhookEvent = require('../src/models/WebhookEvent');

// Mock WebhookEvent model
jest.mock('../src/models/WebhookEvent');

// Mock database
jest.mock('../src/db', () => ({
  query: jest.fn(),
}));

const db = require('../src/db');

// Create test app
const createTestApp = () => {
  const app = express();

  // Capture raw body for webhook signature validation
  app.use(
    '/webhook',
    express.json({
      verify: (req, res, buf) => {
        req.rawBody = buf.toString('utf8');
      },
    }),
  );

  app.use(express.json());

  // Webhook verification endpoint (GET)
  app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === 'test-verify-token') {
      return res.status(200).send(challenge || '');
    }

    res.sendStatus(403);
  });

  // Webhook receiver endpoint (POST)
  app.post('/webhook', validateWebhookSignature('test-app-secret'), async (req, res) => {
    res.sendStatus(200);

    try {
      if (!req.body || Object.keys(req.body).length === 0) {
        console.log('⚠️  Received empty webhook payload');
        return;
      }

      const payload = req.body;
      const eventType = payload.object || 'unknown';
      let pageId = null;

      if (payload.entry && payload.entry.length > 0) {
        const instagramId = payload.entry[0].id;
        const result = await db.query(
          `SELECT page_id FROM instagram_accounts WHERE instagram_id = $1`,
          [instagramId],
        );

        if (result.rows.length > 0) {
          pageId = result.rows[0].page_id;
        }
      }

      const event = await WebhookEvent.create({
        pageId,
        eventType,
        payload,
        status: 'pending',
      });

      console.log(`✅ Webhook event queued: ID ${event.id}, Type: ${eventType}`);
    } catch (error) {
      console.error('❌ Error queueing webhook event:', error);
    }
  });

  return app;
};

// Helper to generate valid webhook signature
function generateWebhookSignature(payload, appSecret) {
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const signature = crypto.createHmac('sha256', appSecret).update(body).digest('hex');
  return `sha256=${signature}`;
}

describe('Webhook Routes', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });

  describe('GET /webhook - Verification Handshake', () => {
    it('should verify webhook subscription with correct token', async () => {
      const response = await request(app).get('/webhook').query({
        'hub.mode': 'subscribe',
        'hub.verify_token': 'test-verify-token',
        'hub.challenge': 'test-challenge-123',
      });

      expect(response.status).toBe(200);
      expect(response.text).toBe('test-challenge-123');
    });

    it('should reject verification with incorrect token', async () => {
      const response = await request(app).get('/webhook').query({
        'hub.mode': 'subscribe',
        'hub.verify_token': 'wrong-token',
        'hub.challenge': 'test-challenge-123',
      });

      expect(response.status).toBe(403);
    });

    it('should reject verification with missing mode', async () => {
      const response = await request(app).get('/webhook').query({
        'hub.verify_token': 'test-verify-token',
        'hub.challenge': 'test-challenge-123',
      });

      expect(response.status).toBe(403);
    });
  });

  describe('POST /webhook - Signature Validation', () => {
    it('should accept webhook with valid signature', async () => {
      const payload = {
        object: 'instagram',
        entry: [
          {
            id: '123456789',
            messaging: [
              {
                sender: { id: 'user123' },
                message: { text: 'Hello' },
              },
            ],
          },
        ],
      };

      const signature = generateWebhookSignature(payload, 'test-app-secret');

      db.query.mockResolvedValue({ rows: [{ page_id: 1 }] });
      WebhookEvent.create.mockResolvedValue({ id: 1, ...payload });

      const response = await request(app)
        .post('/webhook')
        .set('X-Hub-Signature-256', signature)
        .set('Content-Type', 'application/json')
        .send(payload);

      expect(response.status).toBe(200);
      expect(WebhookEvent.create).toHaveBeenCalled();
    });

    it('should reject webhook with invalid signature', async () => {
      const payload = {
        object: 'instagram',
        entry: [{ id: '123456789' }],
      };

      // Generate a valid hex signature but with wrong secret
      const wrongSignature = generateWebhookSignature(payload, 'wrong-secret');

      const response = await request(app)
        .post('/webhook')
        .set('X-Hub-Signature-256', wrongSignature)
        .set('Content-Type', 'application/json')
        .send(payload);

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Invalid signature' });
    });

    it('should reject webhook with missing signature', async () => {
      const payload = {
        object: 'instagram',
        entry: [{ id: '123456789' }],
      };

      const response = await request(app)
        .post('/webhook')
        .set('Content-Type', 'application/json')
        .send(payload);

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Missing signature' });
    });

    it('should reject webhook with malformed signature format', async () => {
      const payload = {
        object: 'instagram',
        entry: [{ id: '123456789' }],
      };

      const response = await request(app)
        .post('/webhook')
        .set('X-Hub-Signature-256', 'invalid-format')
        .set('Content-Type', 'application/json')
        .send(payload);

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Invalid signature format' });
    });

    it('should handle empty webhook payload gracefully', async () => {
      const signature = generateWebhookSignature({}, 'test-app-secret');

      const response = await request(app)
        .post('/webhook')
        .set('X-Hub-Signature-256', signature)
        .set('Content-Type', 'application/json')
        .send({});

      expect(response.status).toBe(200);
      expect(WebhookEvent.create).not.toHaveBeenCalled();
    });

    it('should queue webhook event with correct payload', async () => {
      const payload = {
        object: 'instagram',
        entry: [
          {
            id: '123456789',
            changes: [
              {
                field: 'comments',
                value: { comment_id: 'comment123' },
              },
            ],
          },
        ],
      };

      const signature = generateWebhookSignature(payload, 'test-app-secret');

      db.query.mockResolvedValue({ rows: [{ page_id: 1 }] });
      WebhookEvent.create.mockResolvedValue({ id: 1, ...payload });

      await request(app)
        .post('/webhook')
        .set('X-Hub-Signature-256', signature)
        .set('Content-Type', 'application/json')
        .send(payload);

      expect(WebhookEvent.create).toHaveBeenCalledWith({
        pageId: 1,
        eventType: 'instagram',
        payload,
        status: 'pending',
      });
    });

    it('should handle webhook without page lookup', async () => {
      const payload = {
        object: 'instagram',
        entry: [{ id: 'unknown-id' }],
      };

      const signature = generateWebhookSignature(payload, 'test-app-secret');

      db.query.mockResolvedValue({ rows: [] });
      WebhookEvent.create.mockResolvedValue({ id: 1, ...payload });

      await request(app)
        .post('/webhook')
        .set('X-Hub-Signature-256', signature)
        .set('Content-Type', 'application/json')
        .send(payload);

      expect(WebhookEvent.create).toHaveBeenCalledWith({
        pageId: null,
        eventType: 'instagram',
        payload,
        status: 'pending',
      });
    });
  });
});
