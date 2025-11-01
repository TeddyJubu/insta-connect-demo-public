'use client';

/**
 * OnboardingFlow Component
 * 
 * Guided step-by-step onboarding for new users connecting Instagram accounts
 */

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  details: string[];
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 1,
    title: 'Welcome to Insta Connect',
    description: 'Connect your Instagram Business account to monitor webhooks and manage your content',
    icon: (
      <svg className="h-12 w-12 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2 1m2-1l-2-1m2 1v2.5" />
      </svg>
    ),
    details: [
      'Monitor Instagram webhook events in real-time',
      'Track content changes and interactions',
      'Manage multiple Instagram Business accounts',
      'View detailed event history and statistics',
    ],
  },
  {
    id: 2,
    title: 'Connect Your Instagram Account',
    description: 'Link your Instagram Business account using Meta OAuth',
    icon: (
      <svg className="h-12 w-12 text-brand-600" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073z" />
      </svg>
    ),
    details: [
      'You will be redirected to Meta for secure authentication',
      'Grant necessary permissions for webhook access',
      'Your account will be securely linked',
      'You can connect multiple accounts',
    ],
  },
  {
    id: 3,
    title: 'Configure Webhooks',
    description: 'Set up webhook subscriptions for your Instagram account',
    icon: (
      <svg className="h-12 w-12 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    details: [
      'Webhooks will automatically be configured',
      'Receive real-time notifications for account changes',
      'Monitor content updates and interactions',
      'View all events in the webhook dashboard',
    ],
  },
  {
    id: 4,
    title: 'Start Monitoring',
    description: 'View your connected accounts and webhook events',
    icon: (
      <svg className="h-12 w-12 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    details: [
      'Access your dashboard to view all connected accounts',
      'Monitor webhook events in real-time',
      'View detailed statistics and event history',
      'Manage your account settings',
    ],
  },
];

interface OnboardingFlowProps {
  onComplete?: () => void;
  onConnect?: () => void;
}

export function OnboardingFlow({ onComplete, onConnect }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const step = ONBOARDING_STEPS[currentStep];
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onComplete?.();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleConnect = () => {
    onConnect?.();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-slate-900">Getting Started</h1>
            <span className="text-sm font-medium text-slate-600">
              Step {currentStep + 1} of {ONBOARDING_STEPS.length}
            </span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-600 transition-all duration-300"
              style={{ width: `${((currentStep + 1) / ONBOARDING_STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <Card className="mb-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              {step.icon}
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              {step.title}
            </h2>
            <p className="text-slate-600">
              {step.description}
            </p>
          </div>

          {/* Step Details */}
          <div className="bg-slate-50 rounded-lg p-6 mb-8">
            <h3 className="font-semibold text-slate-900 mb-4">What you'll do:</h3>
            <ul className="space-y-3">
              {step.details.map((detail, index) => (
                <li key={index} className="flex items-start">
                  <svg className="h-5 w-5 text-brand-600 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-slate-700">{detail}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Navigation */}
          <div className="flex gap-4">
            {currentStep > 0 && (
              <Button
                variant="outline"
                onClick={() => setCurrentStep(currentStep - 1)}
              >
                Previous
              </Button>
            )}
            {currentStep === 1 && (
              <Button
                variant="secondary"
                onClick={handleConnect}
                className="flex-1"
              >
                Connect Instagram Account
              </Button>
            )}
            {currentStep !== 1 && (
              <Button
                onClick={handleNext}
                className="flex-1"
              >
                {isLastStep ? 'Get Started' : 'Next'}
              </Button>
            )}
          </div>
        </Card>

        {/* Step Indicators */}
        <div className="flex justify-center gap-2">
          {ONBOARDING_STEPS.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStep(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentStep
                  ? 'bg-brand-600 w-8'
                  : index < currentStep
                  ? 'bg-brand-300 w-2'
                  : 'bg-slate-300 w-2'
              }`}
              aria-label={`Go to step ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

