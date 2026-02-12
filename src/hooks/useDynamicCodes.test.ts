import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDynamicCodes } from './useDynamicCodes';
import { useDynamicCodesStore } from '../stores/dynamicCodesStore';
import { useAuthStore } from '../stores/authStore';
import { workerApi } from '../api/worker';
import type { DynamicQRRecord } from '../api/types';

vi.mock('../api/worker', () => ({
  workerApi: {
    listCodes: vi.fn(),
    getUsage: vi.fn(),
    createCode: vi.fn(),
    updateCode: vi.fn(),
    deleteCode: vi.fn(),
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
  destinationUrl: `https://${shortCode}.com`,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  status: 'active',
  ownerId: 'u1',
  ...overrides,
});

const mockUsage = { ownerId: 'u1', limit: 25, total: 5, active: 3, paused: 1, expired: 1, remaining: 20 };

beforeEach(() => {
  useDynamicCodesStore.getState().reset();
  useAuthStore.setState({ token: 'test-token' });
  vi.clearAllMocks();
});

describe('useDynamicCodes', () => {
  describe('fetchCodes', () => {
    it('fetches and stores codes', async () => {
      const codes = [makeCode('abc'), makeCode('xyz')];
      vi.mocked(workerApi.listCodes).mockResolvedValue(codes);

      const { result } = renderHook(() => useDynamicCodes());
      await act(() => result.current.fetchCodes());

      expect(workerApi.listCodes).toHaveBeenCalledWith('test-token', undefined);
      expect(result.current.codes).toEqual(codes);
    });

    it('fetches with status filter', async () => {
      vi.mocked(workerApi.listCodes).mockResolvedValue([]);

      const { result } = renderHook(() => useDynamicCodes());
      await act(() => result.current.fetchCodes('paused'));

      expect(workerApi.listCodes).toHaveBeenCalledWith('test-token', 'paused');
    });

    it('shows error toast on failure', async () => {
      vi.mocked(workerApi.listCodes).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useDynamicCodes());
      await act(() => result.current.fetchCodes());

      const { toast } = await import('sonner');
      expect(toast.error).toHaveBeenCalledWith('Failed to load codes');
    });

    it('does nothing without token', async () => {
      useAuthStore.setState({ token: null });

      const { result } = renderHook(() => useDynamicCodes());
      await act(() => result.current.fetchCodes());

      expect(workerApi.listCodes).not.toHaveBeenCalled();
    });
  });

  describe('fetchUsage', () => {
    it('fetches and stores usage', async () => {
      vi.mocked(workerApi.getUsage).mockResolvedValue(mockUsage);

      const { result } = renderHook(() => useDynamicCodes());
      await act(() => result.current.fetchUsage());

      expect(result.current.usage).toEqual(mockUsage);
    });
  });

  describe('createCode', () => {
    it('creates code and adds to list', async () => {
      const code = makeCode('new');
      vi.mocked(workerApi.createCode).mockResolvedValue(code);
      vi.mocked(workerApi.getUsage).mockResolvedValue(mockUsage);

      const { result } = renderHook(() => useDynamicCodes());
      let created: DynamicQRRecord | null = null;
      await act(async () => {
        created = await result.current.createCode({ destinationUrl: 'https://new.com' });
      });

      expect(created).toEqual(code);
      expect(result.current.codes).toHaveLength(1);
      expect(result.current.selectedCode).toEqual(code);
    });

    it('returns null on failure', async () => {
      vi.mocked(workerApi.createCode).mockRejectedValue(new Error('fail'));

      const { result } = renderHook(() => useDynamicCodes());
      let created: DynamicQRRecord | null = null;
      await act(async () => {
        created = await result.current.createCode({ destinationUrl: 'https://fail.com' });
      });

      expect(created).toBeNull();
    });
  });

  describe('updateCode', () => {
    it('updates code in list', async () => {
      const original = makeCode('abc');
      const updated = makeCode('abc', { destinationUrl: 'https://updated.com' });
      useDynamicCodesStore.getState().setCodes([original]);
      vi.mocked(workerApi.updateCode).mockResolvedValue(updated);

      const { result } = renderHook(() => useDynamicCodes());
      let success = false;
      await act(async () => {
        success = await result.current.updateCode('abc', { destinationUrl: 'https://updated.com' });
      });

      expect(success).toBe(true);
      expect(result.current.codes[0].destinationUrl).toBe('https://updated.com');
    });

    it('returns false on failure', async () => {
      vi.mocked(workerApi.updateCode).mockRejectedValue(new Error('fail'));

      const { result } = renderHook(() => useDynamicCodes());
      let success = false;
      await act(async () => {
        success = await result.current.updateCode('abc', { status: 'paused' });
      });

      expect(success).toBe(false);
    });
  });

  describe('deleteCode', () => {
    it('removes code from list', async () => {
      useDynamicCodesStore.getState().setCodes([makeCode('abc'), makeCode('xyz')]);
      vi.mocked(workerApi.deleteCode).mockResolvedValue({ deleted: 'abc' });
      vi.mocked(workerApi.getUsage).mockResolvedValue(mockUsage);

      const { result } = renderHook(() => useDynamicCodes());
      let success = false;
      await act(async () => {
        success = await result.current.deleteCode('abc');
      });

      expect(success).toBe(true);
      expect(result.current.codes).toHaveLength(1);
      expect(result.current.codes[0].shortCode).toBe('xyz');
    });
  });

  describe('selectCode', () => {
    it('sets selected code', () => {
      const code = makeCode('abc');
      const { result } = renderHook(() => useDynamicCodes());
      act(() => result.current.selectCode(code));
      expect(result.current.selectedCode).toEqual(code);
    });
  });

  describe('setStatusFilter', () => {
    it('sets status filter', () => {
      const { result } = renderHook(() => useDynamicCodes());
      act(() => result.current.setStatusFilter('active'));
      expect(result.current.statusFilter).toBe('active');
    });
  });
});
