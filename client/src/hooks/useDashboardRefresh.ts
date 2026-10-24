import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseDashboardRefreshOptions {
  onRefresh: () => Promise<void>;
  intervalSeconds?: number;
  defaultAutoRefresh?: boolean;
}

export interface UseDashboardRefreshResult {
  isRefreshing: boolean;
  autoRefresh: boolean;
  setAutoRefresh: (val: boolean) => void;
  lastUpdated: string;
  refreshNow: () => Promise<void>;
}

export const useDashboardRefresh = ({
  onRefresh,
  intervalSeconds = 15,
  defaultAutoRefresh = true,
}: UseDashboardRefreshOptions): UseDashboardRefreshResult => {
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(defaultAutoRefresh);
  const [lastUpdated, setLastUpdated] = useState<string>(() => {
    return new Date().toLocaleTimeString('en-US', { hour12: false });
  });

  const isFetchingRef = useRef<boolean>(false);
  const intervalRef = useRef<any>(null);
  const onRefreshRef = useRef<() => Promise<void>>(onRefresh);

  // Keep latest onRefresh callback reference
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  const refreshNow = useCallback(async () => {
    // Prevent overlapping API requests
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsRefreshing(true);

    try {
      await onRefreshRef.current();
      const now = new Date();
      setLastUpdated(now.toLocaleTimeString('en-US', { hour12: false }));
      // Notify listening components such as the navbar notifications dropdown
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('foodbridge:refresh:notifications'));
      }
    } catch (err) {
      console.error('Manual dashboard refresh error:', err);
    } finally {
      setIsRefreshing(false);
      isFetchingRef.current = false;
    }
  }, []);

  // Background auto-refresh interval with browser tab visibility handling
  useEffect(() => {
    if (!autoRefresh) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    const intervalMs = intervalSeconds * 1000;

    const executeAutoRefresh = async () => {
      // Pause polling when browser tab is hidden to save network/battery
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      setIsRefreshing(true);

      try {
        await onRefreshRef.current();
        const now = new Date();
        setLastUpdated(now.toLocaleTimeString('en-US', { hour12: false }));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('foodbridge:refresh:notifications'));
        }
      } catch (err) {
        console.error('Auto dashboard refresh notice:', err);
      } finally {
        setIsRefreshing(false);
        isFetchingRef.current = false;
      }
    };

    const startPolling = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(executeAutoRefresh, intervalMs);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Tab restored: trigger immediate synchronization and resume interval
        executeAutoRefresh();
        startPolling();
      } else {
        // Tab hidden: clear interval
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    startPolling();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [autoRefresh, intervalSeconds]);

  return {
    isRefreshing,
    autoRefresh,
    setAutoRefresh,
    lastUpdated,
    refreshNow,
  };
};
