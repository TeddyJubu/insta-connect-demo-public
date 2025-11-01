'use client';

/**
 * Onboarding Page
 * 
 * Guided onboarding flow for new users
 */

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { usePages } from '@/lib/hooks';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import { useEffect } from 'react';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { pages, loading: pagesLoading } = usePages();

  // Redirect to dashboard if user already has connected pages
  useEffect(() => {
    if (!authLoading && !pagesLoading && pages.length > 0) {
      router.push('/dashboard');
    }
  }, [authLoading, pagesLoading, pages, router]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  if (authLoading || pagesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600" />
          </div>
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <OnboardingFlow
      onConnect={() => {
        window.location.href = '/oauth/start';
      }}
      onComplete={() => {
        router.push('/dashboard');
      }}
    />
  );
}

