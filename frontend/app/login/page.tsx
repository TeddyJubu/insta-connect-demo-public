'use client';

/**
 * Login Page
 * 
 * User login with email and password
 */

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

export default function LoginPage() {
  const { login, loading, error: authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }
    
    try {
      await login(email, password);
    } catch (err) {
      // Error is handled by AuthContext
      console.error('Login error:', err);
    }
  };

  return (
    <div className="relative min-h-screen">
      {/* Background decorations */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="grid-overlay absolute inset-0 opacity-40"></div>
        <div className="absolute -left-32 top-10 h-64 w-64 rounded-full bg-brand-200 blur-3xl"></div>
        <div className="absolute bottom-[-10rem] right-[-4rem] h-96 w-96 rounded-full bg-sky-200 blur-3xl"></div>
      </div>

      {/* Content */}
      <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900">
              Welcome back
            </h1>
            <p className="mt-2 text-slate-600">
              Sign in to your account to continue
            </p>
          </div>

          {/* Login Form */}
          <Card>
            <form onSubmit={handleSubmit} className="space-y-5">
              {authError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
                  {authError}
                </div>
              )}

              <Input
                type="email"
                name="email"
                label="Email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
                autoComplete="email"
                autoFocus
              />

              <Input
                type="password"
                name="password"
                label="Password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                autoComplete="current-password"
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
              >
                Sign in
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-600">
              Don't have an account?{' '}
              <Link
                href="/register"
                className="font-medium text-brand-600 hover:text-brand-700"
              >
                Sign up
              </Link>
            </div>
          </Card>

          {/* Footer */}
          <p className="mt-8 text-center text-sm text-slate-500">
            By signing in, you agree to our{' '}
            <a href="/privacy-policy.html" className="text-slate-700 hover:text-slate-900">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

