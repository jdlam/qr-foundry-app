import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AnalyticsView } from './AnalyticsView';
import { useAuthStore } from '../../stores/authStore';
import { workerApi } from '../../api/worker';
import type { ScanAnalyticsResponse } from '../../api/types';

vi.mock('../../api/worker', () => ({
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

const mockAnalytics: ScanAnalyticsResponse = {
  shortCode: 'abc',
  period: { start: '2025-01-01', end: '2025-01-31' },
  totalScans: 150,
  scansOverTime: [{ date: '2025-01-15', count: 50 }],
  topCountries: [{ name: 'US', count: 100 }],
  topCities: [{ name: 'New York', count: 50 }],
  topReferers: [{ name: 'google.com', count: 30 }],
};

beforeEach(() => {
  useAuthStore.setState({ token: 'test-token' });
  vi.clearAllMocks();
});

describe('AnalyticsView', () => {
  it('renders header with shortCode', async () => {
    vi.mocked(workerApi.getCodeAnalytics).mockResolvedValue(mockAnalytics);
    render(<AnalyticsView shortCode="abc" onBack={vi.fn()} />);
    expect(screen.getByText('Analytics: abc')).toBeInTheDocument();
  });

  it('displays analytics data after loading', async () => {
    vi.mocked(workerApi.getCodeAnalytics).mockResolvedValue(mockAnalytics);
    render(<AnalyticsView shortCode="abc" onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument();
    });
    expect(screen.getByText('US')).toBeInTheDocument();
    expect(screen.getByText('New York')).toBeInTheDocument();
    expect(screen.getByText('google.com')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    vi.mocked(workerApi.getCodeAnalytics).mockReturnValue(new Promise(() => {}));
    render(<AnalyticsView shortCode="abc" onBack={vi.fn()} />);
    expect(screen.getByText('Loading analytics...')).toBeInTheDocument();
  });

  it('calls onBack when back button is clicked', async () => {
    vi.mocked(workerApi.getCodeAnalytics).mockResolvedValue(mockAnalytics);
    const onBack = vi.fn();
    render(<AnalyticsView shortCode="abc" onBack={onBack} />);

    screen.getByRole('button', { name: 'Back to code detail' }).click();
    expect(onBack).toHaveBeenCalled();
  });

  it('shows date range controls', async () => {
    vi.mocked(workerApi.getCodeAnalytics).mockResolvedValue(mockAnalytics);
    render(<AnalyticsView shortCode="abc" onBack={vi.fn()} />);
    expect(screen.getByText('7d')).toBeInTheDocument();
    expect(screen.getByText('30d')).toBeInTheDocument();
    expect(screen.getByText('90d')).toBeInTheDocument();
  });
});
