import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAnalytics } from './useAnalytics';
import { useAuthStore } from '../stores/authStore';
import { workerApi } from '../api/worker';
import type { ScanAnalyticsResponse, ScanAnalyticsSummary } from '../api/types';

vi.mock('../api/worker', () => ({
  workerApi: {
    getCodeAnalytics: vi.fn(),
    getAnalyticsOverview: vi.fn(),
  },
  WorkerApiError: class WorkerApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.name = 'WorkerApiError';
      this.status = status;
    }
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockCodeAnalytics: ScanAnalyticsResponse = {
  shortCode: 'abc',
  period: { start: '2025-01-01', end: '2025-01-31' },
  totalScans: 150,
  scansOverTime: [{ date: '2025-01-15', count: 50 }],
  topCountries: [{ name: 'US', count: 100 }],
  topCities: [{ name: 'New York', count: 50 }],
  topReferers: [{ name: 'google.com', count: 30 }],
};

const mockOverview: ScanAnalyticsSummary = {
  period: { start: '2025-01-01', end: '2025-01-31' },
  totalScans: 500,
  scansOverTime: [{ date: '2025-01-15', count: 100 }],
  topCodes: [{ name: 'abc', count: 200, label: 'My Link' }],
  topCountries: [{ name: 'US', count: 300 }],
};

beforeEach(() => {
  useAuthStore.setState({ token: 'test-token' });
  vi.clearAllMocks();
});

describe('useAnalytics', () => {
  it('has default state', () => {
    const { result } = renderHook(() => useAnalytics());
    expect(result.current.codeAnalytics).toBeNull();
    expect(result.current.overview).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.granularity).toBe('day');
    expect(result.current.dateRange.start).toBeTruthy();
    expect(result.current.dateRange.end).toBeTruthy();
  });

  describe('fetchCodeAnalytics', () => {
    it('fetches and stores per-code analytics', async () => {
      vi.mocked(workerApi.getCodeAnalytics).mockResolvedValue(mockCodeAnalytics);

      const { result } = renderHook(() => useAnalytics());
      await act(() => result.current.fetchCodeAnalytics('abc'));

      expect(result.current.codeAnalytics).toEqual(mockCodeAnalytics);
      expect(workerApi.getCodeAnalytics).toHaveBeenCalledWith('test-token', 'abc', expect.objectContaining({ granularity: 'day' }));
    });

    it('shows error on failure', async () => {
      vi.mocked(workerApi.getCodeAnalytics).mockRejectedValue(new Error('fail'));

      const { result } = renderHook(() => useAnalytics());
      await act(() => result.current.fetchCodeAnalytics('abc'));

      const { toast } = await import('sonner');
      expect(toast.error).toHaveBeenCalledWith('Failed to load analytics');
    });

    it('does nothing without token', async () => {
      useAuthStore.setState({ token: null });

      const { result } = renderHook(() => useAnalytics());
      await act(() => result.current.fetchCodeAnalytics('abc'));

      expect(workerApi.getCodeAnalytics).not.toHaveBeenCalled();
    });
  });

  describe('fetchOverview', () => {
    it('fetches and stores overview', async () => {
      vi.mocked(workerApi.getAnalyticsOverview).mockResolvedValue(mockOverview);

      const { result } = renderHook(() => useAnalytics());
      await act(() => result.current.fetchOverview());

      expect(result.current.overview).toEqual(mockOverview);
    });
  });

  describe('setGranularity', () => {
    it('updates granularity', () => {
      const { result } = renderHook(() => useAnalytics());
      act(() => result.current.setGranularity('week'));
      expect(result.current.granularity).toBe('week');
    });
  });

  describe('setDateRange', () => {
    it('updates date range', () => {
      const { result } = renderHook(() => useAnalytics());
      act(() => result.current.setDateRange({ start: '2025-06-01', end: '2025-06-30' }));
      expect(result.current.dateRange).toEqual({ start: '2025-06-01', end: '2025-06-30' });
    });
  });
});
