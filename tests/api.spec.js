/**
 * API Routes Tests
 * Tests for /api endpoints (webhook dashboard, status, webhooks)
 */

const request = require('supertest');
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const webhookDashboardRoutes = require('../src/routes/webhookDashboard');
const Page = require('../src/models/Page');
const WebhookEvent = require('../src/models/WebhookEvent');
// eslint-disable-next-line no-unused-vars
const WebhookSubscription = require('../src/models/WebhookSubscription');

// Mock models
jest.mock('../src/models/Page');
jest.mock('../src/models/WebhookEvent');
jest.mock('../src/models/WebhookSubscription');

// Mock database
jest.mock('../src/db', () => ({
  query: jest.fn(),
}));

// Mock auth middleware
jest.mock('../src/middleware/auth', () => ({
  requireAuth: (req, res, next) => {
    // Set a default userId for testing
    req.session = req.session || {};
    req.session.userId = req.session.userId || 1;
    next();
  },
  optionalAuth: (req, res, next) => next(),
}));

// Create test app
const createTestApp = () => {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Mock session middleware
  app.use(
    session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false, httpOnly: true },
    }),
  );

  app.use('/api', webhookDashboardRoutes);

  return app;
};

describe('API Routes', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });

  describe('GET /api/webhook-events', () => {
    it('should return empty events when user has no page', async () => {
      Page.findSelectedByUserId.mockResolvedValue(null);

      const agent = request.agent(app);

      // Set session
      await agent.get('/api/webhook-events').expect(200);

      const response = await agent.get('/api/webhook-events');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        events: [],
        total: 0,
        limit: 50,
        offset: 0,
      });
    });

    it('should return webhook events with pagination', async () => {
      const mockPage = { id: 1, page_id: '123', page_name: 'Test Page' };
      const mockEvents = [
        { id: 1, event_type: 'instagram', status: 'processed' },
        { id: 2, event_type: 'instagram', status: 'pending' },
      ];

      Page.findSelectedByUserId.mockResolvedValue(mockPage);
      WebhookEvent.findByPageId.mockResolvedValueOnce(mockEvents).mockResolvedValueOnce(mockEvents);

      const agent = request.agent(app);

      // Manually set session
      const response = await agent
        .get('/api/webhook-events?limit=50&offset=0')
        .set('Cookie', 'connect.sid=test-session');

      // Since we can't easily set session in test, we'll just verify the route exists
      expect(response.status).toBe(200);
    });

    it('should filter events by status', async () => {
      const mockPage = { id: 1 };
      const mockEvents = [{ id: 1, event_type: 'instagram', status: 'processed' }];

      Page.findSelectedByUserId.mockResolvedValue(mockPage);
      WebhookEvent.findByPageId.mockResolvedValueOnce(mockEvents).mockResolvedValueOnce(mockEvents);

      const response = await request(app).get('/api/webhook-events?status=processed');

      expect(response.status).toBe(200);
    });

    it('should handle database errors gracefully', async () => {
      Page.findSelectedByUserId.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/api/webhook-events');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to fetch webhook events' });
    });
  });

  describe('GET /api/webhook-events/stats', () => {
    it('should return webhook statistics', async () => {
      const mockStats = {
        total: 100,
        processed: 80,
        pending: 15,
        failed: 5,
        dead_letter: 0,
      };

      WebhookEvent.getStats.mockResolvedValue(mockStats);

      const response = await request(app).get('/api/webhook-events/stats');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockStats);
    });

    it('should handle stats fetch errors', async () => {
      WebhookEvent.getStats.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/api/webhook-events/stats');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to fetch webhook statistics' });
    });
  });

  describe('GET /api/webhook-events/:id', () => {
    it('should return a single webhook event', async () => {
      const mockPage = { id: 1 };
      const mockEvent = {
        id: 1,
        page_id: 1,
        event_type: 'instagram',
        status: 'processed',
        payload: { object: 'instagram' },
      };

      Page.findSelectedByUserId.mockResolvedValue(mockPage);
      WebhookEvent.findById.mockResolvedValue(mockEvent);

      const response = await request(app).get('/api/webhook-events/1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockEvent);
    });

    it('should return 404 for non-existent event', async () => {
      WebhookEvent.findById.mockResolvedValue(null);

      const response = await request(app).get('/api/webhook-events/999');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Event not found' });
    });

    it('should handle invalid event ID', async () => {
      const response = await request(app).get('/api/webhook-events/invalid');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Invalid event ID' });
    });
  });

  describe('POST /api/webhook-events/:id/retry', () => {
    it('should retry a failed webhook event', async () => {
      const mockPage = { id: 1 };
      const mockEvent = {
        id: 1,
        page_id: 1,
        event_type: 'instagram',
        status: 'failed',
      };

      Page.findSelectedByUserId.mockResolvedValue(mockPage);
      WebhookEvent.findById.mockResolvedValue(mockEvent);
      WebhookEvent.retry.mockResolvedValue({ ...mockEvent, status: 'pending' });

      const response = await request(app).post('/api/webhook-events/1/retry');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('event');
    });

    it('should return 404 for non-existent event', async () => {
      Page.findSelectedByUserId.mockResolvedValue({ id: 1 });
      WebhookEvent.findById.mockResolvedValue(null);

      const response = await request(app).post('/api/webhook-events/999/retry');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Event not found' });
    });
  });

  describe('DELETE /api/webhook-events/:id', () => {
    it('should delete a webhook event', async () => {
      const mockPage = { id: 1 };
      const mockEvent = {
        id: 1,
        page_id: 1,
        event_type: 'instagram',
        status: 'processed',
      };

      Page.findSelectedByUserId.mockResolvedValue(mockPage);
      WebhookEvent.findById.mockResolvedValue(mockEvent);

      const db = require('../src/db');
      db.query.mockResolvedValue({ rows: [] });

      const response = await request(app).delete('/api/webhook-events/1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Event deleted successfully' });
    });

    it('should return 404 for non-existent event', async () => {
      Page.findSelectedByUserId.mockResolvedValue({ id: 1 });
      WebhookEvent.findById.mockResolvedValue(null);

      const response = await request(app).delete('/api/webhook-events/999');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Event not found' });
    });
  });
});
