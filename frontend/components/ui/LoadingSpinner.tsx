/**
 * Loading Spinner Component
 * 
 * Reusable loading spinner with different sizes
 */

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-4',
    lg: 'h-12 w-12 border-4',
  };

  return (
    <div
      className={`animate-spin rounded-full border-slate-200 border-t-brand-500 ${sizeClasses[size]} ${className}`}
    />
  );
}

interface LoadingStateProps {
  message?: string;
  fullScreen?: boolean;
}

export function LoadingState({ message = 'Loading...', fullScreen = false }: LoadingStateProps) {
  const containerClass = fullScreen
    ? 'flex min-h-screen items-center justify-center bg-slate-50'
    : 'flex items-center justify-center p-12';

  return (
    <div className={containerClass}>
      <div className="text-center">
        <LoadingSpinner size="lg" className="mx-auto" />
        <p className="mt-4 text-slate-600">{message}</p>
      </div>
    </div>
  );
}

