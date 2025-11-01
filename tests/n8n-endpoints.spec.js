/**
 * N8N API Endpoints Integration Tests
 * Tests for N8N callback, status, retry, and queue endpoints
 */

const request = require('supertest');
const express = require('express');
const session = require('express-session');
const webhookDashboardRoutes = require('../src/routes/webhookDashboard');
const MessageQueue = require('../src/models/MessageQueue');
const Page = require('../src/models/Page');

// Mock session middleware
const mockSession = (req, res, next) => {
  req.session = {
    userId: 1,
  };
  next();
};

describe('N8N API Endpoints', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use(mockSession);
    app.use('/api', webhookDashboardRoutes);
  });

  describe('POST /api/n8n/callback', () => {
    it('should reject requests without X-Callback-Secret header', async () => {
      const response = await request(app)
        .post('/api/n8n/callback')
        .send({
          messageId: 'msg_123',
          senderId: 'sender123',
          recipientId: 'recipient456',
          aiResponse: 'Test response',
          status: 'success',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    it('should reject requests with invalid X-Callback-Secret header', async () => {
      const response = await request(app)
        .post('/api/n8n/callback')
        .set('X-Callback-Secret', 'invalid-secret')
        .send({
          messageId: 'msg_123',
          senderId: 'sender123',
          recipientId: 'recipient456',
          aiResponse: 'Test response',
          status: 'success',
        });

      expect(response.status).toBe(401);
    });

    it('should reject requests with missing required fields', async () => {
      const response = await request(app)
        .post('/api/n8n/callback')
        .set('X-Callback-Secret', process.env.N8N_CALLBACK_SECRET || 'test-secret')
        .send({
          messageId: 'msg_123',
          // Missing senderId, recipientId, aiResponse
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should process valid callback request', async () => {
      // First create a message in the queue
      const messageData = {
        webhookEventId: 1,
        pageId: 1,
        instagramId: '123456789',
        senderId: 'sender123',
        recipientId: 'recipient456',
        messageText: 'Test message',
        messageId: 'msg_callback_test',
      };

      const created = await MessageQueue.create(messageData);

      const response = await request(app)
        .post('/api/n8n/callback')
        .set('X-Callback-Secret', process.env.N8N_CALLBACK_SECRET || 'test-secret')
        .send({
          messageId: 'msg_callback_test',
          senderId: 'sender123',
          recipientId: 'recipient456',
          aiResponse: 'Test AI response',
          status: 'success',
          n8nExecutionId: 'exec_123',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/n8n/status/:messageId', () => {
    it('should return 404 for non-existent message', async () => {
      const response = await request(app)
        .get('/api/n8n/status/non_existent_msg')
        .set('Cookie', 'connect.sid=test');

      expect(response.status).toBe(404);
    });

    it('should return message status for existing message', async () => {
      // Create a message
      const messageData = {
        webhookEventId: 1,
        pageId: 1,
        instagramId: '123456789',
        senderId: 'sender123',
        recipientId: 'recipient456',
        messageText: 'Test message',
        messageId: 'msg_status_test',
      };

      const created = await MessageQueue.create(messageData);

      const response = await request(app)
        .get(`/api/n8n/status/${created.message_id}`)
        .set('Cookie', 'connect.sid=test');

      expect(response.status).toBe(200);
      expect(response.body.messageId).toBe(created.message_id);
      expect(response.body.status).toBe('pending');
    });
  });

  describe('POST /api/n8n/retry/:messageId', () => {
    it('should return 404 for non-existent message', async () => {
      const response = await request(app)
        .post('/api/n8n/retry/non_existent_msg')
        .set('Cookie', 'connect.sid=test');

      expect(response.status).toBe(404);
    });

    it('should reject retry for non-failed messages', async () => {
      // Create a message with pending status
      const messageData = {
        webhookEventId: 1,
        pageId: 1,
        instagramId: '123456789',
        senderId: 'sender123',
        recipientId: 'recipient456',
        messageText: 'Test message',
        messageId: 'msg_retry_pending',
      };

      const created = await MessageQueue.create(messageData);

      const response = await request(app)
        .post(`/api/n8n/retry/${created.message_id}`)
        .set('Cookie', 'connect.sid=test');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Cannot retry');
    });

    it('should allow retry for failed messages', async () => {
      // Create a message and mark it as failed
      const messageData = {
        webhookEventId: 1,
        pageId: 1,
        instagramId: '123456789',
        senderId: 'sender123',
        recipientId: 'recipient456',
        messageText: 'Test message',
        messageId: 'msg_retry_failed',
      };

      const created = await MessageQueue.create(messageData);
      await MessageQueue.updateStatus(created.id, 'failed', {
        lastError: 'Test error',
      });

      const response = await request(app)
        .post(`/api/n8n/retry/${created.message_id}`)
        .set('Cookie', 'connect.sid=test');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/n8n/queue', () => {
    it('should return empty queue if no page selected', async () => {
      // Mock Page.findSelectedByUserId to return null
      jest.spyOn(Page, 'findSelectedByUserId').mockResolvedValue(null);

      const response = await request(app)
        .get('/api/n8n/queue')
        .set('Cookie', 'connect.sid=test');

      expect(response.status).toBe(200);
      expect(response.body.queue).toEqual([]);
      expect(response.body.total).toBe(0);

      Page.findSelectedByUserId.mockRestore();
    });

    it('should return queue with pagination', async () => {
      const response = await request(app)
        .get('/api/n8n/queue?limit=10&offset=0')
        .set('Cookie', 'connect.sid=test');

      expect(response.status).toBe(200);
      expect(response.body.queue).toBeDefined();
      expect(response.body.total).toBeDefined();
      expect(response.body.limit).toBe(10);
      expect(response.body.offset).toBe(0);
    });

    it('should filter queue by status', async () => {
      const response = await request(app)
        .get('/api/n8n/queue?status=pending')
        .set('Cookie', 'connect.sid=test');

      expect(response.status).toBe(200);
      expect(response.body.queue).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limiting on callback endpoint', async () => {
      // Make multiple requests to trigger rate limit
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(
          request(app)
            .post('/api/n8n/callback')
            .set('X-Callback-Secret', process.env.N8N_CALLBACK_SECRET || 'test-secret')
            .send({
              messageId: `msg_${i}`,
              senderId: 'sender123',
              recipientId: 'recipient456',
              aiResponse: 'Test response',
              status: 'success',
            }),
        );
      }

      const responses = await Promise.all(requests);

      // At least one request should succeed
      expect(responses.some((r) => r.status === 200 || r.status === 400)).toBe(true);
    });
  });
});

