import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AnalyticsOverview } from './AnalyticsOverview';
import { useAuthStore } from '../../stores/authStore';
import { workerApi } from '../../api/worker';
import type { ScanAnalyticsSummary } from '../../api/types';

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

describe('AnalyticsOverview', () => {
  it('renders header', async () => {
    vi.mocked(workerApi.getAnalyticsOverview).mockResolvedValue(mockOverview);
    render(<AnalyticsOverview onBack={vi.fn()} />);
    expect(screen.getByText('Analytics Overview')).toBeInTheDocument();
  });

  it('displays overview data', async () => {
    vi.mocked(workerApi.getAnalyticsOverview).mockResolvedValue(mockOverview);
    render(<AnalyticsOverview onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('500')).toBeInTheDocument();
    });
    expect(screen.getByText('abc')).toBeInTheDocument();
    expect(screen.getByText('My Link')).toBeInTheDocument();
    expect(screen.getByText('US')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    vi.mocked(workerApi.getAnalyticsOverview).mockReturnValue(new Promise(() => {}));
    render(<AnalyticsOverview onBack={vi.fn()} />);
    expect(screen.getByText('Loading analytics...')).toBeInTheDocument();
  });

  it('calls onBack when back button is clicked', async () => {
    vi.mocked(workerApi.getAnalyticsOverview).mockResolvedValue(mockOverview);
    const onBack = vi.fn();
    render(<AnalyticsOverview onBack={onBack} />);

    screen.getByRole('button', { name: 'Back to codes' }).click();
    expect(onBack).toHaveBeenCalled();
  });
});
