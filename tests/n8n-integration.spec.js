/**
 * N8N Integration Tests
 * Tests for N8N integration service and message queue processing
 */

const request = require('supertest');
const nock = require('nock');
const MessageQueue = require('../src/models/MessageQueue');
const { extractMessageData, forwardToN8N } = require('../src/services/n8nIntegration');

describe('N8N Integration', () => {
  describe('extractMessageData', () => {
    it('should extract message data from valid Instagram webhook payload', () => {
      const payload = {
        entry: [
          {
            id: '123456789',
            messaging: [
              {
                sender: { id: 'sender123' },
                recipient: { id: 'recipient456' },
                message: {
                  mid: 'msg_id_123',
                  text: 'Hello, this is a test message',
                },
                timestamp: 1234567890,
              },
            ],
          },
        ],
      };

      const result = extractMessageData(payload);

      expect(result).toBeDefined();
      expect(result.instagramId).toBe('123456789');
      expect(result.senderId).toBe('sender123');
      expect(result.recipientId).toBe('recipient456');
      expect(result.messageText).toBe('Hello, this is a test message');
      expect(result.messageId).toBe('msg_id_123');
    });

    it('should return null for invalid payload', () => {
      const result = extractMessageData(null);
      expect(result).toBeNull();
    });

    it('should return null for payload without messaging', () => {
      const payload = {
        entry: [
          {
            id: '123456789',
            messaging: [],
          },
        ],
      };

      const result = extractMessageData(payload);
      expect(result).toBeNull();
    });

    it('should return null for non-message events', () => {
      const payload = {
        entry: [
          {
            id: '123456789',
            messaging: [
              {
                sender: { id: 'sender123' },
                recipient: { id: 'recipient456' },
                delivery: { mids: ['msg_id_123'] },
              },
            ],
          },
        ],
      };

      const result = extractMessageData(payload);
      expect(result).toBeNull();
    });
  });

  describe('forwardToN8N', () => {
    beforeEach(() => {
      process.env.N8N_ENABLED = 'true';
      process.env.N8N_WEBHOOK_URL = 'https://n8n.example.com/webhook/instagram';
      process.env.N8N_CALLBACK_SECRET = 'test-secret';
      process.env.BASE_URL = 'http://localhost:3000';
    });

    afterEach(() => {
      nock.cleanAll();
    });

    it('should forward message to N8N successfully', async () => {
      const messageData = {
        messageId: 'msg_123',
        senderId: 'sender123',
        recipientId: 'recipient456',
        messageText: 'Test message',
        timestamp: 1234567890,
      };

      nock('https://n8n.example.com')
        .post('/webhook/instagram')
        .reply(200, { success: true });

      const result = await forwardToN8N(messageData, 1);

      expect(result).toBe(true);
    });

    it('should return false if N8N is disabled', async () => {
      process.env.N8N_ENABLED = 'false';

      const messageData = {
        messageId: 'msg_123',
        senderId: 'sender123',
        recipientId: 'recipient456',
        messageText: 'Test message',
      };

      const result = await forwardToN8N(messageData, 1);

      expect(result).toBe(false);
    });

    it('should return false if N8N webhook URL is not configured', async () => {
      delete process.env.N8N_WEBHOOK_URL;

      const messageData = {
        messageId: 'msg_123',
        senderId: 'sender123',
        recipientId: 'recipient456',
        messageText: 'Test message',
      };

      const result = await forwardToN8N(messageData, 1);

      expect(result).toBe(false);
    });

    it('should handle N8N webhook errors', async () => {
      const messageData = {
        messageId: 'msg_123',
        senderId: 'sender123',
        recipientId: 'recipient456',
        messageText: 'Test message',
      };

      nock('https://n8n.example.com')
        .post('/webhook/instagram')
        .reply(500, { error: 'Internal server error' });

      const result = await forwardToN8N(messageData, 1);

      expect(result).toBe(false);
    });

    it('should handle timeout errors', async () => {
      process.env.N8N_TIMEOUT_MS = '100';

      const messageData = {
        messageId: 'msg_123',
        senderId: 'sender123',
        recipientId: 'recipient456',
        messageText: 'Test message',
      };

      nock('https://n8n.example.com')
        .post('/webhook/instagram')
        .delayConnection(200)
        .reply(200, { success: true });

      const result = await forwardToN8N(messageData, 1);

      expect(result).toBe(false);
    });
  });

  describe('MessageQueue Model', () => {
    describe('create', () => {
      it('should create a new message in the queue', async () => {
        const messageData = {
          webhookEventId: 1,
          pageId: 1,
          instagramId: '123456789',
          senderId: 'sender123',
          recipientId: 'recipient456',
          messageText: 'Test message',
          messageId: 'msg_123',
        };

        const result = await MessageQueue.create(messageData);

        expect(result).toBeDefined();
        expect(result.sender_id).toBe('sender123');
        expect(result.status).toBe('pending');
        expect(result.retry_count).toBe(0);
      });
    });

    describe('findByMessageId', () => {
      it('should find a message by message ID', async () => {
        const messageData = {
          webhookEventId: 1,
          pageId: 1,
          instagramId: '123456789',
          senderId: 'sender123',
          recipientId: 'recipient456',
          messageText: 'Test message',
          messageId: 'msg_unique_123',
        };

        const created = await MessageQueue.create(messageData);
        const found = await MessageQueue.findByMessageId('msg_unique_123');

        expect(found).toBeDefined();
        expect(found.id).toBe(created.id);
      });
    });

    describe('findByStatus', () => {
      it('should find messages by status', async () => {
        const messageData = {
          webhookEventId: 1,
          pageId: 1,
          instagramId: '123456789',
          senderId: 'sender123',
          recipientId: 'recipient456',
          messageText: 'Test message',
          messageId: 'msg_status_test',
        };

        await MessageQueue.create(messageData);
        const results = await MessageQueue.findByStatus('pending', { limit: 10 });

        expect(Array.isArray(results)).toBe(true);
        expect(results.length).toBeGreaterThan(0);
      });
    });

    describe('updateStatus', () => {
      it('should update message status', async () => {
        const messageData = {
          webhookEventId: 1,
          pageId: 1,
          instagramId: '123456789',
          senderId: 'sender123',
          recipientId: 'recipient456',
          messageText: 'Test message',
          messageId: 'msg_update_test',
        };

        const created = await MessageQueue.create(messageData);
        const updated = await MessageQueue.updateStatus(created.id, 'processing', {
          aiResponse: 'Test response',
        });

        expect(updated.status).toBe('processing');
        expect(updated.ai_response).toBe('Test response');
      });
    });

    describe('incrementRetry', () => {
      it('should increment retry count', async () => {
        const messageData = {
          webhookEventId: 1,
          pageId: 1,
          instagramId: '123456789',
          senderId: 'sender123',
          recipientId: 'recipient456',
          messageText: 'Test message',
          messageId: 'msg_retry_test',
        };

        const created = await MessageQueue.create(messageData);
        const updated = await MessageQueue.incrementRetry(created.id, 'Test error');

        expect(updated.retry_count).toBe(1);
        expect(updated.last_error).toBe('Test error');
      });
    });

    describe('getStats', () => {
      it('should return queue statistics', async () => {
        const stats = await MessageQueue.getStats();

        expect(stats).toBeDefined();
        expect(stats.total).toBeDefined();
        expect(stats.pending).toBeDefined();
        expect(stats.processing).toBeDefined();
        expect(stats.failed).toBeDefined();
      });
    });
  });
});

