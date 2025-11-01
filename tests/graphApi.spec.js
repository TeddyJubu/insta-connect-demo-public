/**
 * Graph API Utility Tests
 *
 * Tests for retry logic, timeout handling, error classification, and recovery
 */

const { makeRequest, graphApi, classifyError } = require('../src/utils/graphApi');

// Mock fetch
global.fetch = jest.fn();

describe('Graph API Utility', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('classifyError', () => {
    it('should classify timeout errors', () => {
      const error = new Error('Request timeout');
      error.name = 'AbortError';

      const classification = classifyError(error, null, null);

      expect(classification.type).toBe('TIMEOUT');
      expect(classification.recoverable).toBe(true);
    });

    it('should classify rate limit errors (429)', () => {
      const error = new Error('Too Many Requests');
      const response = {
        status: 429,
        headers: new Map([['retry-after', '60']]),
      };

      const classification = classifyError(error, response, null);

      expect(classification.type).toBe('RATE_LIMITED');
      expect(classification.recoverable).toBe(true);
      expect(classification.retryAfter).toBe(60);
    });

    it('should classify invalid token errors (401)', () => {
      const error = new Error('Unauthorized');
      const response = { status: 401 };
      const data = { error: { code: 190, message: 'Invalid token' } };

      const classification = classifyError(error, response, data);

      expect(classification.type).toBe('INVALID_TOKEN');
      expect(classification.recoverable).toBe(true);
    });

    it('should classify permission denied errors (403)', () => {
      const error = new Error('Forbidden');
      const response = { status: 403 };
      const data = { error: { code: 200, message: 'Permission denied' } };

      const classification = classifyError(error, response, data);

      expect(classification.type).toBe('PERMISSION_DENIED');
      expect(classification.recoverable).toBe(true);
    });

    it('should classify invalid request errors (400)', () => {
      const error = new Error('Bad Request');
      const response = { status: 400 };
      const data = { error: { code: 100, message: 'Invalid parameter' } };

      const classification = classifyError(error, response, data);

      expect(classification.type).toBe('INVALID_REQUEST');
      expect(classification.recoverable).toBe(false);
    });

    it('should classify server errors (500)', () => {
      const error = new Error('Internal Server Error');
      const response = { status: 500 };

      const classification = classifyError(error, response, null);

      expect(classification.type).toBe('SERVER_ERROR');
      expect(classification.recoverable).toBe(true);
    });
  });

  describe('makeRequest', () => {
    it('should make a successful request', async () => {
      const mockData = { id: '123', name: 'Test' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      const result = await makeRequest('/me', {
        accessToken: 'test-token',
      });

      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should retry on server error', async () => {
      const mockData = { id: '123', name: 'Test' };

      // First call fails with 500
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: { message: 'Server error' } }),
      });

      // Second call succeeds
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      const result = await makeRequest('/me', {
        accessToken: 'test-token',
        maxRetries: 1,
      });

      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    }, 15000);

    it('should not retry on non-recoverable errors', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { code: 100, message: 'Invalid parameter' } }),
      });

      await expect(
        makeRequest('/me', {
          accessToken: 'test-token',
          maxRetries: 3,
        }),
      ).rejects.toThrow();

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should call onRetry callback', async () => {
      const onRetry = jest.fn();
      const mockData = { id: '123' };

      // First call fails
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: { message: 'Server error' } }),
      });

      // Second call succeeds
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      await makeRequest('/me', {
        accessToken: 'test-token',
        maxRetries: 1,
        onRetry,
      });

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(
        expect.objectContaining({
          attempt: 1,
          maxRetries: 1,
          delay: expect.any(Number),
          classification: expect.objectContaining({
            type: 'SERVER_ERROR',
          }),
        }),
      );
    }, 15000);

    it('should call onError callback on final failure', async () => {
      const onError = jest.fn();

      global.fetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: { message: 'Server error' } }),
      });

      await expect(
        makeRequest('/me', {
          accessToken: 'test-token',
          maxRetries: 1,
          onError,
        }),
      ).rejects.toThrow();

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          attempt: 2,
          maxRetries: 1,
          classification: expect.objectContaining({
            type: 'SERVER_ERROR',
          }),
        }),
      );
    }, 15000);

    it('should handle timeout', async () => {
      const controller = new AbortController();
      global.fetch.mockImplementationOnce(() => {
        controller.abort();
        return Promise.reject(new DOMException('Aborted', 'AbortError'));
      });

      await expect(
        makeRequest('/me', {
          accessToken: 'test-token',
          timeout: 1000,
          maxRetries: 0,
        }),
      ).rejects.toThrow();
    });
  });

  describe('graphApi convenience methods', () => {
    it('should call getMe with correct parameters', async () => {
      const mockData = { id: '123', name: 'Test User' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      const result = await graphApi.getMe('test-token');

      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/me'),
        expect.any(Object),
      );
    });

    it('should call getPages with correct parameters', async () => {
      const mockData = {
        data: [
          { id: '1', name: 'Page 1', access_token: 'token1' },
          { id: '2', name: 'Page 2', access_token: 'token2' },
        ],
      };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      const result = await graphApi.getPages('test-token');

      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/me/accounts'),
        expect.any(Object),
      );
    });

    it('should call exchangeToken with correct parameters', async () => {
      const mockData = { access_token: 'long-lived-token-xyz', expires_in: 5184000 };
      global.fetch.mockClear();
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      const result = await graphApi.exchangeToken('short-token', 'app-id', 'app-secret');

      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/oauth/access_token'),
        expect.any(Object),
      );
    });

    it('should call subscribeWebhooks with correct parameters', async () => {
      const mockData = { success: true };
      global.fetch.mockClear();
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      const result = await graphApi.subscribeWebhooks('page-id', 'page-token', 'messages');

      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/page-id/subscribed_apps'),
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });
  });
});

