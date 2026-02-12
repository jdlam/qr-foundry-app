import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '../stores/authStore';
import { workerApi, WorkerApiError } from '../api/worker';
import type { ScanAnalyticsResponse, ScanAnalyticsSummary, Granularity } from '../api/types';

function defaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
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
      const message = err instanceof WorkerApiError ? err.message : 'Failed to load analytics';
      toast.error(message);
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
      const message = err instanceof WorkerApiError ? err.message : 'Failed to load analytics';
      toast.error(message);
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
