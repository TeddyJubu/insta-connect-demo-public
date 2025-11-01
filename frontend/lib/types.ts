/**
 * TypeScript Types
 * 
 * Shared type definitions for the application
 */

// User
export interface User {
  id: number;
  email: string;
  createdAt?: string;
  lastLoginAt?: string;
}

// Auth Status
export interface AuthStatus {
  authenticated: boolean;
  userId?: number;
  email?: string;
  user?: User;
}

// Meta Account
export interface MetaAccount {
  id: number;
  userId: number;
  metaUserId: string;
  accessToken: string;
  tokenExpiresAt: string;
  createdAt: string;
  updatedAt: string;
}

// Page
export interface Page {
  id: number;
  metaAccountId: number;
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  tokenExpiresAt: string;
  isSelected: boolean;
  createdAt: string;
  updatedAt: string;
}

// Instagram Account
export interface InstagramAccount {
  id: number;
  pageId: number;
  instagramBusinessAccountId: string;
  username: string;
  createdAt: string;
  updatedAt: string;
}

// Webhook Subscription
export interface WebhookSubscription {
  id: number;
  pageId: number;
  field: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Webhook Event
export interface WebhookEvent {
  id: number;
  pageId?: number;
  eventType: string;
  payload: Record<string, any>;
  status: 'pending' | 'processing' | 'processed' | 'failed' | 'dead_letter';
  retryCount: number;
  lastError?: string;
  receivedAt: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Webhook Stats
export interface WebhookStats {
  total: number;
  pending: number;
  processing: number;
  processed: number;
  failed: number;
  deadLetter: number;
  lastReceived?: string;
}

// API Response Types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface ApiError {
  error: string;
  message?: string;
  details?: any;
}

