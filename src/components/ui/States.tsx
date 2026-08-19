import { type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface SpinnerProps {
  size?: number;
  className?: string;
}

export function Spinner({ size = 24, className = '' }: SpinnerProps) {
  return <Loader2 size={size} className={`animate-spin text-primary-500 ${className}`} />;
}

interface LoadingStateProps {
  label?: string;
  children?: ReactNode;
}

export function LoadingState({ label = 'Loading...', children }: LoadingStateProps) {
  if (children) return <>{children}</>;
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <Spinner size={32} />
      <p className="text-dark-400 text-sm">{label}</p>
    </div>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="w-16 h-16 rounded-full bg-error-500/10 flex items-center justify-center">
        <span className="text-error-400 text-2xl">!</span>
      </div>
      <p className="text-dark-300 text-sm max-w-md text-center">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary text-sm">
          Try again
        </button>
      )}
    </div>
  );
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      {icon && (
        <div className="w-16 h-16 rounded-full bg-dark-800 flex items-center justify-center text-dark-500">
          {icon}
        </div>
      )}
      <div className="text-center">
        <p className="text-dark-200 font-medium">{title}</p>
        {description && <p className="text-dark-400 text-sm mt-1">{description}</p>}
      </div>
      {action}
    </div>
  );
}
