import React from 'react';
import { RefreshCw, Clock } from 'lucide-react';

export interface DashboardRefreshBarProps {
  isRefreshing: boolean;
  autoRefresh: boolean;
  onToggleAutoRefresh: (enabled: boolean) => void;
  lastUpdated: string;
  onRefreshNow: () => void | Promise<void>;
  variant?: 'light' | 'dark';
  className?: string;
}

export const DashboardRefreshBar: React.FC<DashboardRefreshBarProps> = ({
  isRefreshing,
  autoRefresh,
  onToggleAutoRefresh,
  lastUpdated,
  onRefreshNow,
  variant = 'light',
  className = '',
}) => {
  const isDark = variant === 'dark';

  return (
    <div
      className={`inline-flex flex-wrap items-center gap-2 p-1.5 rounded-2xl border text-xs shadow-xs select-none transition-all ${
        isDark
          ? 'bg-forest-800/80 border-forest-600/70 text-white backdrop-blur-md'
          : 'bg-white/95 border-sage/90 text-charcoal-700 shadow-glass backdrop-blur-md'
      } ${className}`}
      data-testid="dashboard-refresh-bar"
    >
      {/* 1. Manual Refresh Now Button */}
      <button
        type="button"
        onClick={() => onRefreshNow()}
        disabled={isRefreshing}
        title="Trigger immediate data refresh"
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all active:scale-95 disabled:opacity-60 cursor-pointer ${
          isDark
            ? 'bg-forest-700 hover:bg-forest-600 text-white border border-forest-500/50 hover:shadow-xs'
            : 'bg-cream-100 hover:bg-emerald-50 text-forest-900 border border-emerald-200/70 hover:border-emerald-300'
        }`}
        id="btn-refresh-now"
      >
        <RefreshCw
          className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : isDark ? 'text-lime-300' : 'text-emerald-700'}`}
        />
        <span>{isRefreshing ? 'Refreshing...' : 'Refresh Now'}</span>
      </button>

      {/* 2. Auto Refresh ON/OFF Toggle */}
      <button
        type="button"
        onClick={() => onToggleAutoRefresh(!autoRefresh)}
        title={autoRefresh ? 'Click to turn off 15-second background auto refresh' : 'Click to turn on 15-second background auto refresh'}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
          isDark
            ? autoRefresh
              ? 'bg-forest-700/90 text-lime-300 border border-lime-400/30'
              : 'bg-forest-900/60 text-charcoal-300 border border-forest-700'
            : autoRefresh
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
              : 'bg-charcoal-100 text-charcoal-600 border border-charcoal-200'
        }`}
        id="btn-auto-refresh-toggle"
      >
        <span
          className={`w-2 h-2 rounded-full transition-all ${
            autoRefresh
              ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse'
              : 'bg-charcoal-400'
          }`}
        />
        <span>
          Auto Refresh: <span className="font-bold">{autoRefresh ? 'ON' : 'OFF'}</span>
        </span>
      </button>

      {/* 3. Last Updated HH:MM:SS Timestamp */}
      <div
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium ${
          isDark ? 'text-charcoal-200 bg-forest-900/40' : 'text-charcoal-600 bg-cream/60'
        }`}
        title="Last successful dashboard synchronization timestamp"
      >
        <Clock className={`w-3.5 h-3.5 ${isDark ? 'text-charcoal-300' : 'text-charcoal-400'}`} />
        <span className="text-[11px] font-sans">Last Updated:</span>
        <span className="font-mono text-xs font-bold tracking-tight text-forest dark:text-lime-300">
          {lastUpdated || '--:--:--'}
        </span>
      </div>
    </div>
  );
};
