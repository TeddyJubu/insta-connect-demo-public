'use client';

/**
 * Dashboard Layout Component
 * 
 * Main layout wrapper for dashboard pages
 */

import { ReactNode } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Navbar } from './Navbar';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center justify-between space-y-4 sm:flex-row sm:space-y-0">
              <p className="text-sm text-slate-500">
                © 2025 Instagram Connect Console. All rights reserved.
              </p>
              <div className="flex space-x-6">
                <a
                  href="/privacy-policy.html"
                  className="text-sm text-slate-500 hover:text-slate-700"
                >
                  Privacy Policy
                </a>
                <a
                  href="https://developers.facebook.com/docs/instagram-platform"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-slate-500 hover:text-slate-700"
                >
                  Documentation
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </ProtectedRoute>
  );
}

