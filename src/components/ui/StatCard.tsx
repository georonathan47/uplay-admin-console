import { type ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  trend?: { value: number; positive: boolean };
  color?: 'primary' | 'secondary' | 'accent' | 'error' | 'warning';
}

const colorMap = {
  primary: 'from-primary-500/20 to-primary-600/5 text-primary-400',
  secondary: 'from-secondary-500/20 to-secondary-600/5 text-secondary-400',
  accent: 'from-accent-500/20 to-accent-600/5 text-accent-400',
  error: 'from-error-500/20 to-error-600/5 text-error-400',
  warning: 'from-warning-500/20 to-warning-600/5 text-warning-400',
};

export function StatCard({ label, value, icon, trend, color = 'primary' }: StatCardProps) {
  return (
    <div className="card p-5 hover:border-dark-700 transition-all duration-300 group">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-dark-400 font-medium">{label}</p>
          <p className="text-2xl font-display font-bold text-white mt-2">{value}</p>
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <span
                className={`text-xs font-semibold ${
                  trend.positive ? 'text-success-400' : 'text-error-400'
                }`}
              >
                {trend.positive ? '+' : ''}
                {trend.value}%
              </span>
              <span className="text-xs text-dark-400">vs last month</span>
            </div>
          )}
        </div>
        <div
          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorMap[color]} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
