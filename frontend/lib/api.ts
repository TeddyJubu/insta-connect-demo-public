/**
 * API Client
 * 
 * Axios instance configured to communicate with the Express backend.
 * Handles authentication cookies and provides typed API methods.
 */

import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
  baseURL: typeof window !== 'undefined' 
    ? '' // In browser, use relative URLs (Next.js will proxy)
    : process.env.BACKEND_URL || 'http://localhost:3000', // In SSR, use backend URL
  withCredentials: true, // Important: Send cookies with requests
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging (development only)
if (process.env.NODE_ENV === 'development') {
  api.interceptors.request.use(
    (config) => {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    },
    (error) => {
      console.error('[API] Request error:', error);
      return Promise.reject(error);
    }
  );
}

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with error status
      console.error('[API] Response error:', error.response.status, error.response.data);
      
      // Handle specific error cases
      if (error.response.status === 401) {
        // Unauthorized - redirect to login
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    } else if (error.request) {
      // Request made but no response
      console.error('[API] No response:', error.request);
    } else {
      // Error setting up request
      console.error('[API] Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default api;

/**
 * API Methods
 */

// Auth
export const authApi = {
  getStatus: () => api.get('/auth/status'),
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }, {
      headers: { 'Content-Type': 'application/json' }
    }),
  register: (email: string, password: string, confirmPassword: string) =>
    api.post('/auth/register', { email, password, confirmPassword }, {
      headers: { 'Content-Type': 'application/json' }
    }),
  logout: () => api.post('/auth/logout', {}, {
    headers: { 'Content-Type': 'application/json' }
  }),
};

// Webhook Events
export const webhookApi = {
  getEvents: (params?: { status?: string; limit?: number; offset?: number }) =>
    api.get('/api/webhook-events', { params }),
  getStats: () => api.get('/api/webhook-events/stats'),
  getEvent: (id: number) => api.get(`/api/webhook-events/${id}`),
  retryEvent: (id: number) => api.post(`/api/webhook-events/${id}/retry`),
  deleteEvent: (id: number) => api.delete(`/api/webhook-events/${id}`),
};

// Pages
export const pageApi = {
  getPages: () => api.get('/api/pages'),
  selectPage: (pageId: number) => api.post('/api/pages/select', { pageId }),
};

// Instagram Accounts
export const instagramApi = {
  getAccounts: () => api.get('/api/instagram-accounts'),
};

