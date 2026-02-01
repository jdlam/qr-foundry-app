import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHistory } from './useHistory';
import { invoke } from '@tauri-apps/api/core';

vi.mock('@tauri-apps/api/core');
const mockInvoke = vi.mocked(invoke);

const mockHistoryItems = [
  {
    id: 1,
    content: 'https://example.com',
    qrType: 'url',
    label: 'Example',
    styleJson: '{}',
    thumbnail: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    content: 'tel:+15551234567',
    qrType: 'phone',
    label: null,
    styleJson: '{}',
    thumbnail: null,
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
];

describe('useHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns initial state', () => {
    const { result } = renderHook(() => useHistory());

    expect(result.current.items).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.total).toBe(0);
    expect(result.current.hasMore).toBe(false);
  });

  describe('fetchHistory', () => {
    it('fetches history with default pagination', async () => {
      mockInvoke.mockResolvedValueOnce({
        items: mockHistoryItems,
        total: 2,
        hasMore: false,
      });

      const { result } = renderHook(() => useHistory());

      await act(async () => {
        await result.current.fetchHistory();
      });

      expect(mockInvoke).toHaveBeenCalledWith('history_list', {
        limit: 50,
        offset: 0,
        search: null,
      });
      expect(result.current.items).toHaveLength(2);
      expect(result.current.total).toBe(2);
      expect(result.current.hasMore).toBe(false);
    });

    it('fetches history with custom pagination', async () => {
      mockInvoke.mockResolvedValueOnce({
        items: [mockHistoryItems[1]],
        total: 2,
        hasMore: false,
      });

      const { result } = renderHook(() => useHistory());

      await act(async () => {
        await result.current.fetchHistory(10, 1);
      });

      expect(mockInvoke).toHaveBeenCalledWith('history_list', {
        limit: 10,
        offset: 1,
        search: null,
      });
    });

    it('fetches history with search', async () => {
      mockInvoke.mockResolvedValueOnce({
        items: [mockHistoryItems[0]],
        total: 1,
        hasMore: false,
      });

      const { result } = renderHook(() => useHistory());

      await act(async () => {
        await result.current.fetchHistory(50, 0, 'example');
      });

      expect(mockInvoke).toHaveBeenCalledWith('history_list', {
        limit: 50,
        offset: 0,
        search: 'example',
      });
    });

    it('appends items when offset > 0', async () => {
      mockInvoke
        .mockResolvedValueOnce({
          items: [mockHistoryItems[0]],
          total: 2,
          hasMore: true,
        })
        .mockResolvedValueOnce({
          items: [mockHistoryItems[1]],
          total: 2,
          hasMore: false,
        });

      const { result } = renderHook(() => useHistory());

      await act(async () => {
        await result.current.fetchHistory(1, 0);
      });

      expect(result.current.items).toHaveLength(1);

      await act(async () => {
        await result.current.fetchHistory(1, 1);
      });

      expect(result.current.items).toHaveLength(2);
    });

    it('handles fetch error gracefully', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Database error'));

      const { result } = renderHook(() => useHistory());

      await act(async () => {
        await result.current.fetchHistory();
      });

      expect(result.current.items).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('saveToHistory', () => {
    it('saves item and refreshes list', async () => {
      mockInvoke
        .mockResolvedValueOnce(3) // history_save returns new ID
        .mockResolvedValueOnce({
          // history_list for refresh
          items: [...mockHistoryItems, { ...mockHistoryItems[0], id: 3 }],
          total: 3,
          hasMore: false,
        });

      const { result } = renderHook(() => useHistory());

      let newId: number | null = null;
      await act(async () => {
        newId = await result.current.saveToHistory({
          content: 'https://new.com',
          qrType: 'url',
          styleJson: '{}',
        });
      });

      expect(mockInvoke).toHaveBeenCalledWith('history_save', {
        item: {
          content: 'https://new.com',
          qrType: 'url',
          styleJson: '{}',
        },
      });
      expect(newId).toBe(3);
    });

    it('returns null on error', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Save failed'));

      const { result } = renderHook(() => useHistory());

      let newId: number | null = 1;
      await act(async () => {
        newId = await result.current.saveToHistory({
          content: 'test',
          qrType: 'text',
          styleJson: '{}',
        });
      });

      expect(newId).toBeNull();
    });
  });

  describe('deleteFromHistory', () => {
    it('deletes item and updates local state', async () => {
      mockInvoke.mockResolvedValueOnce({
        items: mockHistoryItems,
        total: 2,
        hasMore: false,
      });

      const { result } = renderHook(() => useHistory());

      await act(async () => {
        await result.current.fetchHistory();
      });

      mockInvoke.mockResolvedValueOnce(true);

      let success: boolean = false;
      await act(async () => {
        success = await result.current.deleteFromHistory(1);
      });

      expect(mockInvoke).toHaveBeenCalledWith('history_delete', { id: 1 });
      expect(success).toBe(true);
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].id).toBe(2);
      expect(result.current.total).toBe(1);
    });

    it('does not update state on failed delete', async () => {
      mockInvoke.mockResolvedValueOnce({
        items: mockHistoryItems,
        total: 2,
        hasMore: false,
      });

      const { result } = renderHook(() => useHistory());

      await act(async () => {
        await result.current.fetchHistory();
      });

      mockInvoke.mockResolvedValueOnce(false);

      let success: boolean = true;
      await act(async () => {
        success = await result.current.deleteFromHistory(1);
      });

      expect(success).toBe(false);
      expect(result.current.items).toHaveLength(2);
    });

    it('returns false on error', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Delete failed'));

      const { result } = renderHook(() => useHistory());

      let success: boolean = true;
      await act(async () => {
        success = await result.current.deleteFromHistory(1);
      });

      expect(success).toBe(false);
    });
  });

  describe('clearHistory', () => {
    it('clears all history', async () => {
      mockInvoke.mockResolvedValueOnce({
        items: mockHistoryItems,
        total: 2,
        hasMore: false,
      });

      const { result } = renderHook(() => useHistory());

      await act(async () => {
        await result.current.fetchHistory();
      });

      mockInvoke.mockResolvedValueOnce(2); // Returns count of deleted

      let success: boolean = false;
      await act(async () => {
        success = await result.current.clearHistory();
      });

      expect(mockInvoke).toHaveBeenCalledWith('history_clear');
      expect(success).toBe(true);
      expect(result.current.items).toEqual([]);
      expect(result.current.total).toBe(0);
      expect(result.current.hasMore).toBe(false);
    });

    it('returns false on error', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Clear failed'));

      const { result } = renderHook(() => useHistory());

      let success: boolean = true;
      await act(async () => {
        success = await result.current.clearHistory();
      });

      expect(success).toBe(false);
    });
  });

  it('sets isLoading during fetch', async () => {
    let resolvePromise: (value: unknown) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockInvoke.mockReturnValueOnce(pendingPromise as Promise<unknown>);

    const { result } = renderHook(() => useHistory());

    act(() => {
      result.current.fetchHistory();
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolvePromise!({ items: [], total: 0, hasMore: false });
      await pendingPromise;
    });

    expect(result.current.isLoading).toBe(false);
  });
});
