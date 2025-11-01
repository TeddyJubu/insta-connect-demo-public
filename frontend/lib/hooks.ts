/**
 * Custom React Hooks
 * 
 * Reusable hooks for data fetching and state management
 */

import useSWR from 'swr';
import { webhookApi, pageApi, instagramApi } from './api';
import type { WebhookEvent, WebhookStats, Page, InstagramAccount } from './types';

/**
 * Fetcher function for SWR
 */
const fetcher = (fn: () => Promise<any>) => fn().then(res => res.data);

/**
 * Hook to fetch webhook events
 */
export function useWebhookEvents(params?: { 
  status?: string; 
  limit?: number; 
  offset?: number;
  refreshInterval?: number;
}) {
  const { status, limit, offset, refreshInterval = 10000 } = params || {};
  
  const { data, error, mutate, isLoading } = useSWR(
    ['webhook-events', status, limit, offset],
    () => fetcher(() => webhookApi.getEvents({ status, limit, offset })),
    { 
      refreshInterval, // Auto-refresh every 10 seconds by default
      revalidateOnFocus: true,
    }
  );

  return {
    events: (data?.events || []) as WebhookEvent[],
    total: data?.total || 0,
    loading: isLoading,
    error,
    mutate,
  };
}

/**
 * Hook to fetch webhook statistics
 */
export function useWebhookStats(refreshInterval = 10000) {
  const { data, error, mutate, isLoading } = useSWR(
    'webhook-stats',
    () => fetcher(() => webhookApi.getStats()),
    { 
      refreshInterval,
      revalidateOnFocus: true,
    }
  );

  return {
    stats: data as WebhookStats | undefined,
    loading: isLoading,
    error,
    mutate,
  };
}

/**
 * Hook to fetch a single webhook event
 */
export function useWebhookEvent(id: number | null) {
  const { data, error, mutate, isLoading } = useSWR(
    id ? ['webhook-event', id] : null,
    () => fetcher(() => webhookApi.getEvent(id!)),
    {
      revalidateOnFocus: false,
    }
  );

  return {
    event: data as WebhookEvent | undefined,
    loading: isLoading,
    error,
    mutate,
  };
}

/**
 * Hook to fetch pages
 */
export function usePages() {
  const { data, error, mutate, isLoading } = useSWR(
    'pages',
    () => fetcher(() => pageApi.getPages()),
    {
      revalidateOnFocus: true,
    }
  );

  return {
    pages: (data?.pages || []) as Page[],
    selectedPage: data?.selectedPage as Page | undefined,
    loading: isLoading,
    error,
    mutate,
  };
}

/**
 * Hook to fetch Instagram accounts
 */
export function useInstagramAccounts() {
  const { data, error, mutate, isLoading } = useSWR(
    'instagram-accounts',
    () => fetcher(() => instagramApi.getAccounts()),
    {
      revalidateOnFocus: true,
    }
  );

  return {
    accounts: (data?.accounts || []) as InstagramAccount[],
    loading: isLoading,
    error,
    mutate,
  };
}

