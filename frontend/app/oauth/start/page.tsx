'use client';

/**
 * OAuth Start Page
 * 
 * Initiates Instagram OAuth flow
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export default function OAuthStartPage() {
  const { user, loading: authLoading } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleConnect = () => {
    setIsRedirecting(true);
    // Redirect to backend OAuth endpoint
    // Use /api/oauth/start to avoid conflicts with frontend routes
    // The Next.js rewrite will proxy /api/* to the backend
    window.location.href = '/api/oauth/start';
  };

  // If not authenticated, show message
  if (!authLoading && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <Card className="max-w-md">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="mt-4 font-display text-xl font-semibold text-slate-900">
              Authentication Required
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              You need to be logged in to connect your Instagram account.
            </p>
            <div className="mt-6">
              <Link href="/login">
                <Button variant="primary" size="lg" fullWidth>
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-slate-50">
      {/* Background decorations */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="grid-overlay absolute inset-0 opacity-40"></div>
        <div className="absolute -left-32 top-10 h-64 w-64 rounded-full bg-brand-200 blur-3xl"></div>
        <div className="absolute bottom-[-10rem] right-[-4rem] h-96 w-96 rounded-full bg-sky-200 blur-3xl"></div>
      </div>

      {/* Content */}
      <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500">
              <svg
                className="h-10 w-10 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900">
              Connect Instagram Business Account
            </h1>
            <p className="mt-2 text-slate-600">
              Connect your Facebook Page and Instagram Business account to start receiving webhooks
            </p>
          </div>

          {/* Instructions Card */}
          <Card className="mb-6">
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Before you continue
            </h2>
            <div className="mt-4 space-y-3">
              <div className="flex items-start space-x-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                  1
                </div>
                <p className="text-sm text-slate-600">
                  Make sure you have a <strong>Facebook Page</strong> connected to an <strong>Instagram Business Account</strong>
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                  2
                </div>
                <p className="text-sm text-slate-600">
                  You'll be redirected to Facebook to authorize access to your Pages
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                  3
                </div>
                <p className="text-sm text-slate-600">
                  Select the Facebook Page you want to connect
                </p>
              </div>
            </div>
          </Card>

          {/* Permissions Card */}
          <Card className="mb-8">
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Permissions requested
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              We'll request the following permissions:
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="flex items-center space-x-2 text-sm text-slate-700">
                <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>View your Pages</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-slate-700">
                <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Manage Page metadata</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-slate-700">
                <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Instagram basic info</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-slate-700">
                <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Manage messages</span>
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col gap-4 sm:flex-row">
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              onClick={handleConnect}
              loading={isRedirecting}
            >
              <svg
                className="mr-2 h-5 w-5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
              Continue with Facebook
            </Button>
            <Link href="/dashboard" className="sm:w-auto">
              <Button variant="outline" size="lg" fullWidth>
                Cancel
              </Button>
            </Link>
          </div>

          {/* Help Text */}
          <p className="mt-6 text-center text-sm text-slate-500">
            By connecting, you agree to our{' '}
            <a href="/privacy-policy.html" className="text-slate-700 hover:text-slate-900">
              Privacy Policy
            </a>
            {' '}and{' '}
            <a href="https://developers.facebook.com/terms" target="_blank" rel="noopener noreferrer" className="text-slate-700 hover:text-slate-900">
              Facebook Platform Terms
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

