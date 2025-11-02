'use client';

/**
 * N8N Testing Dashboard
 * 
 * Real-time display of N8N webhook callbacks and message processing status
 * Helps verify that the N8N workflow is correctly sending callbacks to the backend
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import api from '@/lib/api';

interface CallbackEvent {
  id: number;
  messageId: string;
  senderId: string;
  recipientId: string;
  messageText: string;
  aiResponse: string | null;
  status: string;
  n8nExecutionId: string | null;
  n8nWorkflowId: string | null;
  lastError: string | null;
  retryCount: number;
  sentToN8nAt: string | null;
  receivedFromN8nAt: string | null;
  sentToInstagramAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse {
  events: CallbackEvent[];
  total: number;
  limit: number;
  offset: number;
}

export default function N8NTestPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<CallbackEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000); // 5 seconds

  // Fetch callback events
  const fetchEvents = useCallback(async () => {
    try {
      setError(null);
      const response = await api.get<ApiResponse>('/api/n8n/callback-events?limit=20');
      setEvents(response.data.events);
    } catch (err: any) {
      const message = err.response?.data?.error || err.message || 'Failed to fetch events';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchEvents();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchEvents]);

  // Clear all events
  const handleClear = async () => {
    if (confirm('Are you sure you want to clear the display? This will not delete data from the database.')) {
      setEvents([]);
    }
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready_to_send':
      case 'sent':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
      case 'dead_letter':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Format timestamp
  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleString();
  };

  // Calculate processing time
  const getProcessingTime = (event: CallbackEvent) => {
    if (!event.sentToN8nAt || !event.receivedFromN8nAt) return '-';
    const sent = new Date(event.sentToN8nAt).getTime();
    const received = new Date(event.receivedFromN8nAt).getTime();
    return `${received - sent}ms`;
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold text-slate-900">
          N8N Testing Dashboard
        </h1>
        <p className="mt-2 text-slate-600">
          Monitor N8N webhook callbacks and message processing in real-time
        </p>
      </div>

      {/* Controls */}
      <Card className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              <span className="text-sm font-medium text-slate-700">Auto-refresh</span>
            </label>
            {autoRefresh && (
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
                className="rounded border border-slate-300 px-3 py-2 text-sm"
              >
                <option value={2000}>Every 2s</option>
                <option value={5000}>Every 5s</option>
                <option value={10000}>Every 10s</option>
                <option value={30000}>Every 30s</option>
              </select>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={fetchEvents}
              variant="secondary"
              className="text-sm"
            >
              🔄 Refresh Now
            </Button>
            <Button
              onClick={handleClear}
              variant="secondary"
              className="text-sm"
            >
              🗑️ Clear
            </Button>
          </div>
        </div>
      </Card>

      {/* Status Message */}
      {error && (
        <Card className="mb-6 border-l-4 border-red-500 bg-red-50">
          <p className="text-sm text-red-800">❌ Error: {error}</p>
        </Card>
      )}

      {loading && events.length === 0 ? (
        <Card className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-brand-500 mb-4"></div>
          <p className="text-slate-600">Loading callback events...</p>
        </Card>
      ) : events.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-slate-600">No callback events yet. Send a test message to N8N to see events here.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Showing {events.length} recent events
          </p>
          {events.map((event) => (
            <Card key={event.id} className="overflow-hidden">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Left Column */}
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Message ID</p>
                    <p className="font-mono text-sm text-slate-900">{event.messageId}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Status</p>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getStatusColor(event.status)}`}>
                      {event.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Sender ID</p>
                    <p className="font-mono text-sm text-slate-900">{event.senderId}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Message Text</p>
                    <p className="text-sm text-slate-700 line-clamp-2">{event.messageText || '-'}</p>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">N8N Execution ID</p>
                    <p className="font-mono text-sm text-slate-900">{event.n8nExecutionId || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Processing Time</p>
                    <p className="text-sm text-slate-700">{getProcessingTime(event)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Received from N8N</p>
                    <p className="text-xs text-slate-600">{formatTime(event.receivedFromN8nAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">AI Response</p>
                    <p className="text-sm text-slate-700 line-clamp-2">{event.aiResponse || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {event.lastError && (
                <div className="mt-4 border-t border-slate-200 pt-4">
                  <p className="text-xs font-semibold text-red-600 uppercase">Error</p>
                  <p className="text-sm text-red-700">{event.lastError}</p>
                </div>
              )}

              {/* Timestamps */}
              <div className="mt-4 border-t border-slate-200 pt-4 grid gap-2 sm:grid-cols-3 text-xs text-slate-500">
                <div>
                  <span className="font-semibold">Sent to N8N:</span> {formatTime(event.sentToN8nAt)}
                </div>
                <div>
                  <span className="font-semibold">Sent to Instagram:</span> {formatTime(event.sentToInstagramAt)}
                </div>
                <div>
                  <span className="font-semibold">Retries:</span> {event.retryCount}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}

