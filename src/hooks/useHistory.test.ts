import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHistory } from './useHistory';
import { historyAdapter } from '@platform';

const mockList = vi.mocked(historyAdapter.list);
const mockSave = vi.mocked(historyAdapter.save);
const mockDelete = vi.mocked(historyAdapter.delete);
const mockClear = vi.mocked(historyAdapter.clear);

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
      mockList.mockResolvedValueOnce({
        items: mockHistoryItems,
        total: 2,
        hasMore: false,
      });

      const { result } = renderHook(() => useHistory());

      await act(async () => {
        await result.current.fetchHistory();
      });

      expect(mockList).toHaveBeenCalledWith(50, 0, null);
      expect(result.current.items).toHaveLength(2);
      expect(result.current.total).toBe(2);
      expect(result.current.hasMore).toBe(false);
    });

    it('fetches history with custom pagination', async () => {
      mockList.mockResolvedValueOnce({
        items: [mockHistoryItems[1]],
        total: 2,
        hasMore: false,
      });

      const { result } = renderHook(() => useHistory());

      await act(async () => {
        await result.current.fetchHistory(10, 1);
      });

      expect(mockList).toHaveBeenCalledWith(10, 1, null);
    });

    it('fetches history with search', async () => {
      mockList.mockResolvedValueOnce({
        items: [mockHistoryItems[0]],
        total: 1,
        hasMore: false,
      });

      const { result } = renderHook(() => useHistory());

      await act(async () => {
        await result.current.fetchHistory(50, 0, 'example');
      });

      expect(mockList).toHaveBeenCalledWith(50, 0, 'example');
    });

    it('appends items when offset > 0', async () => {
      mockList
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
      mockList.mockRejectedValueOnce(new Error('Database error'));

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
      mockSave.mockResolvedValueOnce(3);
      mockList.mockResolvedValueOnce({
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

      expect(mockSave).toHaveBeenCalledWith({
        content: 'https://new.com',
        qrType: 'url',
        styleJson: '{}',
      });
      expect(newId).toBe(3);
    });

    it('returns null on error', async () => {
      mockSave.mockRejectedValueOnce(new Error('Save failed'));

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
      mockList.mockResolvedValueOnce({
        items: mockHistoryItems,
        total: 2,
        hasMore: false,
      });

      const { result } = renderHook(() => useHistory());

      await act(async () => {
        await result.current.fetchHistory();
      });

      mockDelete.mockResolvedValueOnce(true);

      let success: boolean = false;
      await act(async () => {
        success = await result.current.deleteFromHistory(1);
      });

      expect(mockDelete).toHaveBeenCalledWith(1);
      expect(success).toBe(true);
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].id).toBe(2);
      expect(result.current.total).toBe(1);
    });

    it('does not update state on failed delete', async () => {
      mockList.mockResolvedValueOnce({
        items: mockHistoryItems,
        total: 2,
        hasMore: false,
      });

      const { result } = renderHook(() => useHistory());

      await act(async () => {
        await result.current.fetchHistory();
      });

      mockDelete.mockResolvedValueOnce(false);

      let success: boolean = true;
      await act(async () => {
        success = await result.current.deleteFromHistory(1);
      });

      expect(success).toBe(false);
      expect(result.current.items).toHaveLength(2);
    });

    it('returns false on error', async () => {
      mockDelete.mockRejectedValueOnce(new Error('Delete failed'));

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
      mockList.mockResolvedValueOnce({
        items: mockHistoryItems,
        total: 2,
        hasMore: false,
      });

      const { result } = renderHook(() => useHistory());

      await act(async () => {
        await result.current.fetchHistory();
      });

      mockClear.mockResolvedValueOnce(2);

      let success: boolean = false;
      await act(async () => {
        success = await result.current.clearHistory();
      });

      expect(mockClear).toHaveBeenCalled();
      expect(success).toBe(true);
      expect(result.current.items).toEqual([]);
      expect(result.current.total).toBe(0);
      expect(result.current.hasMore).toBe(false);
    });

    it('returns false on error', async () => {
      mockClear.mockRejectedValueOnce(new Error('Clear failed'));

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
    mockList.mockReturnValueOnce(pendingPromise as Promise<never>);

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
