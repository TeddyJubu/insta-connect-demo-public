'use client';

/**
 * OnboardingModal Component
 * 
 * Modal for guiding users through connecting their first Instagram account
 */

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: () => void;
}

export function OnboardingModal({ isOpen, onClose, onConnect }: OnboardingModalProps) {
  const [step, setStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      title: 'Welcome to Insta Connect!',
      description: 'Connect your Instagram Business account to start monitoring webhooks and managing your content.',
      content: (
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-8 w-8 rounded-md bg-brand-100">
                <svg className="h-5 w-5 text-brand-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-slate-900">Real-time Monitoring</h4>
              <p className="text-sm text-slate-600">Track Instagram webhook events as they happen</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-8 w-8 rounded-md bg-brand-100">
                <svg className="h-5 w-5 text-brand-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-slate-900">Multiple Accounts</h4>
              <p className="text-sm text-slate-600">Connect and manage multiple Instagram Business accounts</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-8 w-8 rounded-md bg-brand-100">
                <svg className="h-5 w-5 text-brand-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-slate-900">Detailed Analytics</h4>
              <p className="text-sm text-slate-600">View comprehensive event history and statistics</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'How It Works',
      description: 'Three simple steps to get started',
      content: (
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-brand-600 text-white font-semibold">
                1
              </div>
            </div>
            <div>
              <h4 className="font-medium text-slate-900">Connect Your Account</h4>
              <p className="text-sm text-slate-600">Click the button below to securely connect your Instagram Business account via Meta OAuth</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-brand-600 text-white font-semibold">
                2
              </div>
            </div>
            <div>
              <h4 className="font-medium text-slate-900">Grant Permissions</h4>
              <p className="text-sm text-slate-600">Authorize the necessary permissions for webhook access and account monitoring</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-brand-600 text-white font-semibold">
                3
              </div>
            </div>
            <div>
              <h4 className="font-medium text-slate-900">Start Monitoring</h4>
              <p className="text-sm text-slate-600">Your webhooks are automatically configured and you can start monitoring events</p>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const currentStep = steps[step];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            {currentStep.title}
          </h2>
          <p className="text-slate-600">
            {currentStep.description}
          </p>
        </div>

        <div className="mb-8">
          {currentStep.content}
        </div>

        <div className="flex gap-3">
          {step > 0 && (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
            >
              Back
            </Button>
          )}
          {step < steps.length - 1 ? (
            <Button
              onClick={() => setStep(step + 1)}
              className="flex-1"
            >
              Next
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={onClose}
              >
                Skip
              </Button>
              <Button
                onClick={onConnect}
                className="flex-1"
              >
                Connect Instagram
              </Button>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

