'use client';

/**
 * OAuth Success Page
 * 
 * Shows success message after Instagram connection
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export default function OAuthSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    // Auto-redirect to dashboard after 5 seconds
    const timer = setTimeout(() => {
      router.push('/dashboard');
    }, 5000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="relative min-h-screen bg-slate-50">
      {/* Background decorations */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="grid-overlay absolute inset-0 opacity-40"></div>
        <div className="absolute -left-32 top-10 h-64 w-64 rounded-full bg-green-200 blur-3xl"></div>
        <div className="absolute bottom-[-10rem] right-[-4rem] h-96 w-96 rounded-full bg-sky-200 blur-3xl"></div>
      </div>

      {/* Content */}
      <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Card>
            <div className="text-center">
              {/* Success Icon */}
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <svg
                  className="h-10 w-10 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>

              {/* Success Message */}
              <h1 className="mt-6 font-display text-2xl font-semibold text-slate-900">
                Successfully Connected!
              </h1>
              <p className="mt-2 text-slate-600">
                Your Instagram Business account has been connected successfully.
              </p>

              {/* Features List */}
              <div className="mt-6 space-y-3 text-left">
                <div className="flex items-start space-x-3">
                  <svg
                    className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <p className="text-sm text-slate-600">
                    Webhook subscriptions have been set up
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <svg
                    className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <p className="text-sm text-slate-600">
                    You'll start receiving Instagram events
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <svg
                    className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <p className="text-sm text-slate-600">
                    Access tokens will be automatically refreshed
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-8">
                <Link href="/dashboard">
                  <Button variant="primary" size="lg" fullWidth>
                    Go to Dashboard
                  </Button>
                </Link>
              </div>

              {/* Auto-redirect message */}
              <p className="mt-4 text-xs text-slate-500">
                Redirecting to dashboard in 5 seconds...
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

