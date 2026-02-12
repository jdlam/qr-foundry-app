import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '../stores/authStore';
import { workerApi, WorkerApiError } from '../api/worker';
import { isSessionExpired } from '../api/session';
import type { ScanAnalyticsResponse, ScanAnalyticsSummary, Granularity } from '../api/types';

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function defaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return {
    start: formatLocalDate(start),
    end: formatLocalDate(end),
  };
}

export function useAnalytics() {
  const [codeAnalytics, setCodeAnalytics] = useState<ScanAnalyticsResponse | null>(null);
  const [overview, setOverview] = useState<ScanAnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dateRange, setDateRange] = useState(defaultDateRange);
  const [granularity, setGranularity] = useState<Granularity>('day');

  const fetchCodeAnalytics = useCallback(async (shortCode: string) => {
    const token = useAuthStore.getState().token;
    if (!token) return;

    setIsLoading(true);
    try {
      const data = await workerApi.getCodeAnalytics(token, shortCode, {
        start: dateRange.start,
        end: dateRange.end,
        granularity,
      });
      setCodeAnalytics(data);
    } catch (err) {
      if (!isSessionExpired(err)) {
        const message = err instanceof WorkerApiError ? err.message : 'Failed to load analytics';
        toast.error(message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, granularity]);

  const fetchOverview = useCallback(async () => {
    const token = useAuthStore.getState().token;
    if (!token) return;

    setIsLoading(true);
    try {
      const data = await workerApi.getAnalyticsOverview(token, {
        start: dateRange.start,
        end: dateRange.end,
        granularity,
      });
      setOverview(data);
    } catch (err) {
      if (!isSessionExpired(err)) {
        const message = err instanceof WorkerApiError ? err.message : 'Failed to load analytics';
        toast.error(message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, granularity]);

  return {
    codeAnalytics,
    overview,
    isLoading,
    dateRange,
    granularity,
    fetchCodeAnalytics,
    fetchOverview,
    setDateRange,
    setGranularity,
  };
}
