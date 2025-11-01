/**
 * Logger Utility Tests
 *
 * Tests for structured logging, sensitive data redaction, and context tracking
 */

const { createLogger, redactSensitive, redactObject, requestLoggingMiddleware } = require('../src/utils/logger');

describe('Logger Utility', () => {
  let consoleLogSpy;
  let consoleWarnSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('redactSensitive', () => {
    it('should redact access tokens', () => {
      const input = 'access_token: "abcd1234efgh5678ijkl9012"';
      const result = redactSensitive(input);

      expect(result).toContain('abcd...9012');
      expect(result).not.toContain('efgh5678ijkl');
    });

    it('should redact bearer tokens', () => {
      const input = 'Authorization: Bearer abcd1234efgh5678ijkl9012mnop';
      const result = redactSensitive(input);

      expect(result).toContain('abcd...mnop');
      expect(result).not.toContain('efgh5678ijkl9012');
    });

    it('should redact passwords', () => {
      const input = 'password: "mysecretpassword123"';
      const result = redactSensitive(input);

      expect(result).toContain('myse...d123');
      expect(result).not.toContain('secretpassword');
    });

    it('should handle non-string input', () => {
      expect(redactSensitive(123)).toBe(123);
      expect(redactSensitive(null)).toBe(null);
      expect(redactSensitive(undefined)).toBe(undefined);
    });
  });

  describe('redactObject', () => {
    it('should redact token fields', () => {
      const obj = {
        id: '123',
        access_token: 'abcd1234efgh5678ijkl9012',
        name: 'Test',
      };

      const result = redactObject(obj);

      expect(result.id).toBe('123');
      expect(result.name).toBe('Test');
      expect(result.access_token).toContain('abcd...9012');
      expect(result.access_token).not.toContain('efgh5678ijkl');
    });

    it('should redact nested objects', () => {
      const obj = {
        user: {
          id: '123',
          credentials: {
            password: 'mysecretpassword123',
          },
        },
      };

      const result = redactObject(obj);

      expect(result.user.id).toBe('123');
      expect(result.user.credentials.password).toContain('myse...d123');
    });

    it('should redact nested objects with tokens', () => {
      const obj = {
        data: {
          access_token: 'token1abcd1234efgh5678',
          user_id: '123',
        },
      };

      const result = redactObject(obj);

      expect(result.data.user_id).toBe('123');
      expect(result.data.access_token).toMatch(/toke.*5678/);
      expect(result.data.access_token).not.toContain('abcd1234efgh');
    });

    it('should handle deep nesting', () => {
      const obj = {
        user: {
          id: '123',
          credentials: {
            password: 'mysecretpassword123',
          },
        },
      };

      const result = redactObject(obj);

      expect(result.user.id).toBe('123');
      expect(result.user.credentials.password).toMatch(/myse.*d123/);
    });
  });

  describe('Logger class', () => {
    it('should log info messages', () => {
      const logger = createLogger('test');
      logger.info('Test info message', { key: 'value' });

      expect(consoleLogSpy).toHaveBeenCalled();
      const logOutput = consoleLogSpy.mock.calls[0][0];
      const parsed = JSON.parse(logOutput);

      expect(parsed.level).toBe('INFO');
      expect(parsed.message).toBe('Test info message');
      expect(parsed.key).toBe('value');
    });

    it('should log info messages', () => {
      const logger = createLogger('test');
      logger.info('Test info message', { key: 'value' });

      expect(consoleLogSpy).toHaveBeenCalled();
      const logOutput = consoleLogSpy.mock.calls[0][0];
      const parsed = JSON.parse(logOutput);

      expect(parsed.level).toBe('INFO');
      expect(parsed.message).toBe('Test info message');
    });

    it('should log warning messages', () => {
      const logger = createLogger('test');
      logger.warn('Test warning message', { key: 'value' });

      expect(consoleWarnSpy).toHaveBeenCalled();
      const logOutput = consoleWarnSpy.mock.calls[0][0];
      const parsed = JSON.parse(logOutput);

      expect(parsed.level).toBe('WARN');
      expect(parsed.message).toBe('Test warning message');
    });

    it('should log error messages', () => {
      const logger = createLogger('test');
      const error = new Error('Test error');
      logger.error('Test error message', error, { key: 'value' });

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = consoleErrorSpy.mock.calls[0][0];
      const parsed = JSON.parse(logOutput);

      expect(parsed.level).toBe('ERROR');
      expect(parsed.message).toBe('Test error message');
      expect(parsed.errorType).toBe('Error');
      expect(parsed.errorMessage).toBe('Test error');
    });

    it('should set and clear context', () => {
      const logger = createLogger('test');
      logger.setContext({ requestId: 'req-123', userId: 'user-456' });
      logger.info('Test message');

      const logOutput = consoleLogSpy.mock.calls[0][0];
      const parsed = JSON.parse(logOutput);

      expect(parsed.requestId).toBe('req-123');
      expect(parsed.userId).toBe('user-456');

      logger.clearContext();
      consoleLogSpy.mockClear();
      logger.info('Another message');

      const logOutput2 = consoleLogSpy.mock.calls[0][0];
      const parsed2 = JSON.parse(logOutput2);

      // After clearing context, requestId and userId should be 'N/A'
      expect(parsed2.requestId).toBe('N/A');
      expect(parsed2.userId).toBe('N/A');
    });

    it('should redact sensitive data in logs', () => {
      const logger = createLogger('test');
      logger.info('API call', {
        access_token: 'abcd1234efgh5678ijkl9012',
        userId: '123',
      });

      const logOutput = consoleLogSpy.mock.calls[0][0];
      const parsed = JSON.parse(logOutput);

      expect(parsed.access_token).toContain('abcd...9012');
      expect(parsed.access_token).not.toContain('efgh5678ijkl');
      expect(parsed.userId).toBe('123');
    });

    it('should log API responses', () => {
      const logger = createLogger('test');
      logger.logApiResponse('GET', '/me', 200, 150);

      expect(consoleLogSpy).toHaveBeenCalled();
      const logOutput = consoleLogSpy.mock.calls[0][0];
      const parsed = JSON.parse(logOutput);

      expect(parsed.message).toBe('API Response');
      expect(parsed.method).toBe('GET');
      expect(parsed.endpoint).toBe('/me');
      expect(parsed.status).toBe(200);
      expect(parsed.durationMs).toBe(150);
    });



    it('should log API errors', () => {
      const logger = createLogger('test');
      const error = new Error('API Error');
      logger.logApiError('GET', '/me', error);

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = consoleErrorSpy.mock.calls[0][0];
      const parsed = JSON.parse(logOutput);

      expect(parsed.message).toBe('API Error');
      expect(parsed.method).toBe('GET');
      expect(parsed.endpoint).toBe('/me');
      expect(parsed.errorType).toBe('Error');
    });
  });

  describe('requestLoggingMiddleware', () => {
    it('should attach logger and requestId to request', () => {
      const req = { headers: {}, method: 'GET', path: '/test', query: {} };
      const res = { send: jest.fn() };
      const next = jest.fn();

      requestLoggingMiddleware(req, res, next);

      expect(req.logger).toBeDefined();
      expect(req.requestId).toBeDefined();
      expect(next).toHaveBeenCalled();
    });

    it('should use x-request-id header if provided', () => {
      const req = {
        headers: { 'x-request-id': 'custom-request-id' },
        method: 'GET',
        path: '/test',
        query: {},
      };
      const res = { send: jest.fn() };
      const next = jest.fn();

      requestLoggingMiddleware(req, res, next);

      expect(req.requestId).toBe('custom-request-id');
    });

    it('should log incoming request', () => {
      const req = { headers: {}, method: 'GET', path: '/test', query: {} };
      const res = { send: jest.fn() };
      const next = jest.fn();

      requestLoggingMiddleware(req, res, next);

      expect(consoleLogSpy).toHaveBeenCalled();
      const logOutput = consoleLogSpy.mock.calls[0][0];
      const parsed = JSON.parse(logOutput);

      expect(parsed.message).toBe('Incoming request');
      expect(parsed.method).toBe('GET');
      expect(parsed.path).toBe('/test');
    });
  });
});

