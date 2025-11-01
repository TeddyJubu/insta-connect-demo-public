'use client';

/**
 * OAuth Error Page
 *
 * Shows error message when Instagram connection fails
 */

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

function OAuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error') || 'An unknown error occurred';
  const details = searchParams.get('details');

  return (
    <div className="relative min-h-screen bg-slate-50">
      {/* Background decorations */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="grid-overlay absolute inset-0 opacity-40"></div>
        <div className="absolute -left-32 top-10 h-64 w-64 rounded-full bg-red-200 blur-3xl"></div>
        <div className="absolute bottom-[-10rem] right-[-4rem] h-96 w-96 rounded-full bg-orange-200 blur-3xl"></div>
      </div>

      {/* Content */}
      <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Card>
            <div className="text-center">
              {/* Error Icon */}
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <svg
                  className="h-10 w-10 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>

              {/* Error Message */}
              <h1 className="mt-6 font-display text-2xl font-semibold text-slate-900">
                Connection Failed
              </h1>
              <p className="mt-2 text-slate-600">
                {error}
              </p>

              {/* Error Details */}
              {details && (
                <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-4">
                  <p className="text-sm text-red-800">
                    <strong>Details:</strong> {details}
                  </p>
                </div>
              )}

              {/* Common Issues */}
              <div className="mt-6 space-y-3 text-left">
                <h2 className="text-sm font-semibold text-slate-900">
                  Common issues:
                </h2>
                <div className="flex items-start space-x-3">
                  <svg
                    className="mt-0.5 h-5 w-5 flex-shrink-0 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-sm text-slate-600">
                    Make sure your Facebook Page is connected to an Instagram Business Account
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <svg
                    className="mt-0.5 h-5 w-5 flex-shrink-0 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-sm text-slate-600">
                    Ensure you granted all required permissions during authorization
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <svg
                    className="mt-0.5 h-5 w-5 flex-shrink-0 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-sm text-slate-600">
                    Check that you have admin access to the Facebook Page
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 space-y-3">
                <Link href="/oauth/start">
                  <Button variant="primary" size="lg" fullWidth>
                    Try Again
                  </Button>
                </Link>
                <Link href="/dashboard">
                  <Button variant="outline" size="lg" fullWidth>
                    Back to Dashboard
                  </Button>
                </Link>
              </div>

              {/* Help Link */}
              <p className="mt-6 text-sm text-slate-500">
                Need help?{' '}
                <a
                  href="https://developers.facebook.com/docs/instagram-platform"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-600 hover:text-brand-700"
                >
                  View Documentation
                </a>
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function OAuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-brand-500"></div>
      </div>
    }>
      <OAuthErrorContent />
    </Suspense>
  );
}
