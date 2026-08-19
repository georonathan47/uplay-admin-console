import { type ReactNode } from 'react';

type Variant = 'primary' | 'success' | 'warning' | 'error' | 'neutral' | 'secondary' | 'accent';

const variants: Record<Variant, string> = {
  primary: 'bg-primary-500/15 text-primary-300 border border-primary-500/30',
  success: 'bg-success-500/15 text-success-300 border border-success-500/30',
  warning: 'bg-warning-500/15 text-warning-300 border border-warning-500/30',
  error: 'bg-error-500/15 text-error-300 border border-error-500/30',
  neutral: 'bg-dark-700 text-dark-200 border border-dark-600',
  secondary: 'bg-secondary-500/15 text-secondary-300 border border-secondary-500/30',
  accent: 'bg-accent-500/15 text-accent-300 border border-accent-500/30',
};

interface BadgeProps {
  variant?: Variant;
  children: ReactNode;
  className?: string;
}

export function Badge({ variant = 'neutral', children, className = '' }: BadgeProps) {
  return (
    <span className={`badge ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
