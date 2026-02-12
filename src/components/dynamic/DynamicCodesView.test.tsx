import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DynamicCodesView } from './DynamicCodesView';
import { useDynamicCodesStore } from '../../stores/dynamicCodesStore';
import { useAuthStore } from '../../stores/authStore';
import type { DynamicQRRecord } from '../../api/types';

vi.mock('../../api/worker', () => ({
  workerApi: {
    listCodes: vi.fn().mockResolvedValue([]),
    getUsage: vi.fn().mockResolvedValue({ ownerId: 'u1', limit: 25, total: 0, active: 0, paused: 0, expired: 0, remaining: 25 }),
    createCode: vi.fn(),
    updateCode: vi.fn(),
    deleteCode: vi.fn(),
    getCodeAnalytics: vi.fn().mockResolvedValue({
      shortCode: 'abc', period: { start: '2025-01-01', end: '2025-01-31' },
      totalScans: 42, scansOverTime: [], topCountries: [], topCities: [], topReferers: [],
    }),
    getAnalyticsOverview: vi.fn().mockResolvedValue({
      period: { start: '2025-01-01', end: '2025-01-31' },
      totalScans: 100, scansOverTime: [], topCodes: [], topCountries: [],
    }),
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

const makeCode = (shortCode: string, overrides?: Partial<DynamicQRRecord>): DynamicQRRecord => ({
  shortCode,
  destinationUrl: `https://${shortCode}.example.com`,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  status: 'active',
  ownerId: 'u1',
  ...overrides,
});

function setupSubscription() {
  useAuthStore.setState({
    user: { id: 'u1', email: 'test@test.com', createdAt: '2025-01-01' },
    plan: {
      tier: 'subscription',
      features: ['basic_qr_types', 'advanced_qr_types', 'advanced_customization', 'svg_export', 'pdf_export', 'eps_export', 'batch_generation', 'templates', 'unlimited_history', 'web_asset_pack', 'dynamic_codes', 'analytics'],
      maxCodes: 25,
    },
    token: 'test-token',
  });
}

function setupFreeTier() {
  useAuthStore.setState({
    user: { id: 'u1', email: 'test@test.com', createdAt: '2025-01-01' },
    plan: {
      tier: 'free',
      features: ['basic_qr_types', 'advanced_qr_types', 'advanced_customization', 'svg_export', 'pdf_export', 'eps_export', 'batch_generation', 'templates', 'unlimited_history', 'web_asset_pack'],
      maxCodes: 0,
    },
    token: 'test-token',
  });
}

beforeEach(() => {
  useDynamicCodesStore.getState().reset();
  useAuthStore.setState({ user: null, plan: null, token: null });
  vi.clearAllMocks();
});

describe('DynamicCodesView', () => {
  describe('feature gate', () => {
    it('shows upsell when user has no access', () => {
      setupFreeTier();
      render(<DynamicCodesView />);
      expect(screen.getByText('Dynamic Codes')).toBeInTheDocument();
      expect(screen.getByText('Upgrade to Unlock')).toBeInTheDocument();
    });

    it('shows sign in button when logged out', () => {
      render(<DynamicCodesView />);
      expect(screen.getByText('Sign In to Get Started')).toBeInTheDocument();
    });
  });

  describe('with subscription', () => {
    beforeEach(() => {
      setupSubscription();
    });

    it('renders empty state', async () => {
      render(<DynamicCodesView />);
      await waitFor(() => {
        expect(screen.getByText('No dynamic codes yet')).toBeInTheDocument();
      });
    });

    it('renders code list', async () => {
      useDynamicCodesStore.getState().setCodes([
        makeCode('abc', { label: 'My Link' }),
        makeCode('xyz', { status: 'paused' }),
      ]);
      render(<DynamicCodesView />);
      expect(screen.getByText('abc')).toBeInTheDocument();
      expect(screen.getByText('xyz')).toBeInTheDocument();
      expect(screen.getByText('My Link')).toBeInTheDocument();
    });

    it('selects a code and shows detail', async () => {
      useDynamicCodesStore.getState().setCodes([makeCode('abc', { label: 'Test Label' })]);
      render(<DynamicCodesView />);

      fireEvent.click(screen.getByText('abc'));

      expect(screen.getByText('qrfo.link/abc')).toBeInTheDocument();
      expect(screen.getByDisplayValue('https://abc.example.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Label')).toBeInTheDocument();
    });

    it('shows create form when + New is clicked', () => {
      render(<DynamicCodesView />);
      fireEvent.click(screen.getByText('+ New'));
      expect(screen.getByText('New Dynamic Code')).toBeInTheDocument();
    });

    it('shows pause button for active codes', () => {
      useDynamicCodesStore.getState().setCodes([makeCode('abc')]);
      render(<DynamicCodesView />);
      fireEvent.click(screen.getByText('abc'));
      expect(screen.getByText('Pause')).toBeInTheDocument();
    });

    it('shows resume button for paused codes', () => {
      useDynamicCodesStore.getState().setCodes([makeCode('abc', { status: 'paused' })]);
      render(<DynamicCodesView />);
      fireEvent.click(screen.getByText('abc'));
      expect(screen.getByText('Resume')).toBeInTheDocument();
    });

    it('renders quota bar when usage is loaded', () => {
      useDynamicCodesStore.getState().setCodes([makeCode('abc')]);
      useDynamicCodesStore.getState().setUsage({
        ownerId: 'u1', limit: 25, total: 5, active: 3, paused: 1, expired: 1, remaining: 20,
      });
      render(<DynamicCodesView />);
      fireEvent.click(screen.getByText('abc'));
      expect(screen.getByText('3 / 25 used')).toBeInTheDocument();
    });

    it('switches to analytics overview when analytics toggle is clicked', async () => {
      render(<DynamicCodesView />);
      fireEvent.click(screen.getByText('analytics'));
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Back to codes' })).toBeInTheDocument();
      });
    });

    it('shows per-code analytics when View Analytics is clicked, and returns to detail on back', async () => {
      useDynamicCodesStore.getState().setCodes([makeCode('abc')]);
      render(<DynamicCodesView />);

      // Select a code
      fireEvent.click(screen.getByText('abc'));
      expect(screen.getByText('View Analytics')).toBeInTheDocument();

      // Click View Analytics
      fireEvent.click(screen.getByText('View Analytics'));
      await waitFor(() => {
        expect(screen.getByText('Analytics: abc')).toBeInTheDocument();
      });

      // Click back button
      fireEvent.click(screen.getByRole('button', { name: 'Back to code detail' }));
      expect(screen.getByText('qrfo.link/abc')).toBeInTheDocument();
    });
  });
});
