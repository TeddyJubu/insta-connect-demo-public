/**
 * Graph API Utility Module
 *
 * Provides resilient Graph API calls with:
 * - Automatic retry with exponential backoff
 * - Request timeout handling
 * - Rate limit detection and handling
 * - Structured logging
 * - Error classification and recovery suggestions
 */

const GRAPH_BASE = 'https://graph.facebook.com/v20.0';

// Configuration
const DEFAULT_TIMEOUT = 10000; // 10 seconds
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 30000; // 30 seconds
const RATE_LIMIT_RETRY_DELAY = 60000; // 1 minute

/**
 * Classify API errors and provide recovery suggestions
 */
function classifyError(error, response, data) {
  const status = response?.status;
  const errorCode = data?.error?.code;
  const errorMessage = data?.error?.message || error.message;

  if (error.name === 'AbortError' || error.message === 'Request timeout') {
    return {
      type: 'TIMEOUT',
      message: 'Request timed out',
      recoverable: true,
      suggestion: 'Retry the request',
    };
  }

  if (status === 429) {
    return {
      type: 'RATE_LIMITED',
      message: 'Rate limited by Meta API',
      recoverable: true,
      suggestion: 'Wait before retrying',
      retryAfter: parseInt(response.headers.get('retry-after') || '60'),
    };
  }

  if (status === 401 || errorCode === 190) {
    return {
      type: 'INVALID_TOKEN',
      message: 'Access token is invalid or expired',
      recoverable: true,
      suggestion: 'Token needs to be refreshed or user needs to re-authenticate',
    };
  }

  if (status === 403 || errorCode === 200) {
    return {
      type: 'PERMISSION_DENIED',
      message: 'Missing required permissions or scope',
      recoverable: true,
      suggestion: 'User needs to grant additional permissions',
    };
  }

  if (status === 400 || errorCode === 100) {
    return {
      type: 'INVALID_REQUEST',
      message: 'Invalid request parameters',
      recoverable: false,
      suggestion: 'Check request parameters and try again',
    };
  }

  if (status >= 500) {
    return {
      type: 'SERVER_ERROR',
      message: 'Meta API server error',
      recoverable: true,
      suggestion: 'Retry the request',
    };
  }

  if (status >= 400) {
    return {
      type: 'CLIENT_ERROR',
      message: `HTTP ${status} error`,
      recoverable: false,
      suggestion: 'Check request and try again',
    };
  }

  return {
    type: 'UNKNOWN_ERROR',
    message: errorMessage,
    recoverable: true,
    suggestion: 'Retry the request',
  };
}

/**
 * Calculate exponential backoff delay
 */
function getBackoffDelay(attempt, isRateLimit = false) {
  if (isRateLimit) {
    return RATE_LIMIT_RETRY_DELAY;
  }

  const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
  return Math.min(delay, MAX_RETRY_DELAY);
}

/**
 * Make a Graph API request with retry logic
 *
 * @param {string} endpoint - API endpoint (e.g., '/me', '/me/accounts')
 * @param {Object} options - Request options
 * @param {string} options.method - HTTP method (default: 'GET')
 * @param {string} options.accessToken - Access token for authorization
 * @param {Object} options.params - Query parameters
 * @param {Object} options.body - Request body for POST/PUT
 * @param {number} options.timeout - Request timeout in ms (default: 10000)
 * @param {number} options.maxRetries - Max retry attempts (default: 3)
 * @param {Function} options.onRetry - Callback when retrying
 * @param {Function} options.onError - Callback on error
 * @returns {Promise<Object>} Response data
 */
async function makeRequest(endpoint, options = {}) {
  const {
    method = 'GET',
    accessToken,
    params = {},
    body = null,
    timeout = DEFAULT_TIMEOUT,
    maxRetries = MAX_RETRIES,
    onRetry = null,
    onError = null,
  } = options;

  let lastError = null;
  let lastResponse = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Build URL
      const url = new URL(`${GRAPH_BASE}${endpoint}`);
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, value);
        }
      });

      // Add access token
      if (accessToken) {
        url.searchParams.set('access_token', accessToken);
      }

      // Build request options
      const fetchOptions = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      // Add timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      fetchOptions.signal = controller.signal;

      // Add body for POST/PUT
      if (body && (method === 'POST' || method === 'PUT')) {
        fetchOptions.body = JSON.stringify(body);
      }

      // Make request
      const response = await fetch(url.toString(), fetchOptions);
      clearTimeout(timeoutId);

      // Parse response
      let data = null;
      try {
        data = await response.json();
      } catch (e) {
        // Some Graph responses are empty on success
        data = null;
      }

      // Check for errors
      if (!response.ok) {
        const error = new Error(
          `Graph API error: ${response.status} ${response.statusText}`,
        );
        error.response = response;
        error.data = data;
        throw error;
      }

      // Success
      return data;
    } catch (error) {
      lastError = error;
      lastResponse = error.response;

      // Classify error
      const classification = classifyError(error, lastResponse, error.data);

      // Log error
      console.error(`[GraphAPI] Attempt ${attempt + 1}/${maxRetries + 1} failed:`, {
        endpoint,
        method,
        status: lastResponse?.status,
        errorType: classification.type,
        message: classification.message,
        suggestion: classification.suggestion,
      });

      // Check if we should retry
      if (attempt < maxRetries && classification.recoverable) {
        const delay = getBackoffDelay(attempt, classification.type === 'RATE_LIMITED');

        console.log(`[GraphAPI] Retrying in ${delay}ms...`);

        if (onRetry) {
          onRetry({
            attempt: attempt + 1,
            maxRetries,
            delay,
            classification,
          });
        }

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        // No more retries or not recoverable
        if (onError) {
          onError({
            attempt: attempt + 1,
            maxRetries,
            classification,
            error,
          });
        }

        throw error;
      }
    }
  }

  // Should not reach here
  throw lastError;
}

/**
 * Convenience methods for common Graph API calls
 */
const graphApi = {
  /**
   * Get user info
   */
  getMe: (accessToken, options = {}) =>
    makeRequest('/me', {
      accessToken,
      ...options,
    }),

  /**
   * Get user's pages
   */
  getPages: (accessToken, options = {}) =>
    makeRequest('/me/accounts', {
      accessToken,
      params: {
        fields: 'name,id,access_token',
        ...options.params,
      },
      ...options,
    }),

  /**
   * Get page fields
   */
  getPageFields: (pageId, accessToken, fields = 'instagram_business_account{id,username}', options = {}) =>
    makeRequest(`/${pageId}`, {
      accessToken,
      params: {
        fields,
        ...options.params,
      },
      ...options,
    }),

  /**
   * Subscribe to webhooks
   */
  subscribeWebhooks: (pageId, accessToken, fields = 'messages', options = {}) =>
    makeRequest(`/${pageId}/subscribed_apps`, {
      method: 'POST',
      accessToken,
      params: {
        subscribed_fields: fields,
        ...options.params,
      },
      ...options,
    }),

  /**
   * Unsubscribe from webhooks
   */
  unsubscribeWebhooks: (pageId, accessToken, fields = 'messages', options = {}) =>
    makeRequest(`/${pageId}/subscribed_apps`, {
      method: 'DELETE',
      accessToken,
      params: {
        subscribed_fields: fields,
        ...options.params,
      },
      ...options,
    }),

  /**
   * Exchange token for long-lived token
   */
  exchangeToken: (shortLivedToken, appId, appSecret, options = {}) =>
    makeRequest('/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: shortLivedToken,
        ...options.params,
      },
      ...options,
    }),

  /**
   * Refresh token
   */
  refreshToken: (currentToken, appId, appSecret, options = {}) =>
    makeRequest('/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: currentToken,
        ...options.params,
      },
      ...options,
    }),
};

module.exports = {
  makeRequest,
  graphApi,
  classifyError,
  getBackoffDelay,
};

