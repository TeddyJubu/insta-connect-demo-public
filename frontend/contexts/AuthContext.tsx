'use client';

/**
 * Authentication Context
 * 
 * Provides authentication state and methods throughout the app
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import type { User, AuthStatus } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, confirmPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  /**
   * Check authentication status
   */
  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authApi.getStatus();
      const data: AuthStatus = response.data;

      if (data.authenticated && data.userId && data.email) {
        // Status endpoint returns { authenticated: true, userId, email }
        setUser({
          id: data.userId,
          email: data.email,
        });
      } else {
        setUser(null);
      }
    } catch (err: any) {
      console.error('Auth check failed:', err);
      setUser(null);
      setError(err.response?.data?.error || 'Failed to check authentication');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Login
   */
  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      await authApi.login(email, password);
      
      // Check auth status after login
      await checkAuth();
      
      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Login failed:', err);
      const errorMessage = err.response?.data?.error || 'Login failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Register
   */
  const register = async (email: string, password: string, confirmPassword: string) => {
    try {
      setLoading(true);
      setError(null);

      await authApi.register(email, password, confirmPassword);

      // Check auth status after registration
      await checkAuth();

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Registration failed:', err);
      const errorMessage = err.response?.data?.error || 'Registration failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Logout
   */
  const logout = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await authApi.logout();
      setUser(null);
      
      // Redirect to login
      router.push('/login');
    } catch (err: any) {
      console.error('Logout failed:', err);
      setError(err.response?.data?.error || 'Logout failed');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Check auth on mount
   */
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const value: AuthContextType = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    checkAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to use auth context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

