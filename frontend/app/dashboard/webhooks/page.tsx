'use client';

/**
 * Webhook Dashboard Page
 * 
 * View and manage webhook events
 */

import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useWebhookEvents, useWebhookStats } from '@/lib/hooks';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import type { WebhookEvent } from '@/lib/types';

export default function WebhookDashboardPage() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedEvent, setSelectedEvent] = useState<WebhookEvent | null>(null);

  const { events, total, loading, error, mutate } = useWebhookEvents({
    status: statusFilter || undefined,
    limit: 50,
    refreshInterval: 10000, // Refresh every 10 seconds
  });

  const { stats, loading: statsLoading, error: statsError } = useWebhookStats(10000);

  const handleRefresh = () => {
    mutate();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processed':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'processing':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'failed':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'dead_letter':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-slate-900">
            Webhook Events
          </h1>
          <p className="mt-2 text-slate-600">
            Monitor and manage Instagram webhook events
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline">
          <svg
            className="mr-2 h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
        <Card padding="sm">
          <p className="text-xs font-medium text-slate-600">Total</p>
          <p className="mt-1 font-display text-2xl font-semibold text-slate-900">
            {statsLoading ? '...' : stats?.total || 0}
          </p>
        </Card>
        <Card padding="sm">
          <p className="text-xs font-medium text-slate-600">Pending</p>
          <p className="mt-1 font-display text-2xl font-semibold text-yellow-600">
            {statsLoading ? '...' : stats?.pending || 0}
          </p>
        </Card>
        <Card padding="sm">
          <p className="text-xs font-medium text-slate-600">Processing</p>
          <p className="mt-1 font-display text-2xl font-semibold text-blue-600">
            {statsLoading ? '...' : stats?.processing || 0}
          </p>
        </Card>
        <Card padding="sm">
          <p className="text-xs font-medium text-slate-600">Processed</p>
          <p className="mt-1 font-display text-2xl font-semibold text-green-600">
            {statsLoading ? '...' : stats?.processed || 0}
          </p>
        </Card>
        <Card padding="sm">
          <p className="text-xs font-medium text-slate-600">Failed</p>
          <p className="mt-1 font-display text-2xl font-semibold text-red-600">
            {statsLoading ? '...' : (stats?.failed || 0) + (stats?.deadLetter || 0)}
          </p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-slate-700">Filter by status:</span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStatusFilter('')}
              className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                statusFilter === ''
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                statusFilter === 'pending'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setStatusFilter('processing')}
              className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                statusFilter === 'processing'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              Processing
            </button>
            <button
              onClick={() => setStatusFilter('processed')}
              className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                statusFilter === 'processed'
                  ? 'bg-green-600 text-white'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              Processed
            </button>
            <button
              onClick={() => setStatusFilter('failed')}
              className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                statusFilter === 'failed'
                  ? 'bg-red-600 text-white'
                  : 'bg-red-100 text-red-700 hover:bg-red-200'
              }`}
            >
              Failed
            </button>
          </div>
        </div>
      </Card>

      {/* Error State */}
      {error && (
        <div className="mb-6">
          <ErrorMessage
            message={error.message || 'Failed to load webhook events'}
            variant="error"
          />
        </div>
      )}

      {/* Events List */}
      <Card padding="none">
        {loading ? (
          <LoadingState message="Loading events..." />
        ) : events.length === 0 ? (
          <EmptyState
            title="No events found"
            description={
              statusFilter
                ? `No ${statusFilter} events at the moment.`
                : 'Webhook events will appear here when received.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">
                    Event Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">
                    Received
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">
                    Retries
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {events.map((event) => (
                  <tr
                    key={event.id}
                    className="hover:bg-slate-50 transition cursor-pointer"
                    onClick={() => setSelectedEvent(event)}
                  >
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-900">
                        {event.eventType}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${getStatusColor(
                          event.status
                        )}`}
                      >
                        {event.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {formatDate(event.receivedAt)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {event.retryCount}
                    </td>
                    <td className="px-6 py-4 text-right text-sm">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(event);
                        }}
                        className="text-brand-600 hover:text-brand-700"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedEvent(null)}
        >
          <Card
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="font-display text-xl font-semibold text-slate-900">
                  Event Details
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  ID: {selectedEvent.id}
                </p>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Event Type</label>
                <p className="mt-1 text-slate-900">{selectedEvent.eventType}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Status</label>
                <p className="mt-1">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${getStatusColor(
                      selectedEvent.status
                    )}`}
                  >
                    {selectedEvent.status}
                  </span>
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Received At</label>
                <p className="mt-1 text-slate-900">{formatDate(selectedEvent.receivedAt)}</p>
              </div>

              {selectedEvent.processedAt && (
                <div>
                  <label className="text-sm font-medium text-slate-700">Processed At</label>
                  <p className="mt-1 text-slate-900">{formatDate(selectedEvent.processedAt)}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-slate-700">Retry Count</label>
                <p className="mt-1 text-slate-900">{selectedEvent.retryCount}</p>
              </div>

              {selectedEvent.lastError && (
                <div>
                  <label className="text-sm font-medium text-slate-700">Last Error</label>
                  <div className="mt-1 rounded-lg bg-red-50 border border-red-200 p-3">
                    <p className="text-sm text-red-800">{selectedEvent.lastError}</p>
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-slate-700">Payload</label>
                <pre className="mt-1 overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-100">
                  {JSON.stringify(selectedEvent.payload, null, 2)}
                </pre>
              </div>
            </div>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}

