import { useCallback, useState } from 'react';
import { historyAdapter } from '@platform';
import type { HistoryItem, NewHistoryItem } from '../platform/types';

export type { HistoryItem, NewHistoryItem };

export function useHistory() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const fetchHistory = useCallback(
    async (limit = 50, offset = 0, search?: string): Promise<void> => {
      setIsLoading(true);
      try {
        const result = await historyAdapter.list(limit, offset, search || null);

        if (offset === 0) {
          setItems(result.items);
        } else {
          setItems((prev) => [...prev, ...result.items]);
        }
        setTotal(result.total);
        setHasMore(result.hasMore);
      } catch (error) {
        console.error('Failed to fetch history:', error);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const saveToHistory = useCallback(
    async (item: NewHistoryItem): Promise<number | null> => {
      try {
        const id = await historyAdapter.save(item);
        // Refresh the list
        await fetchHistory();
        return id;
      } catch (error) {
        console.error('Failed to save to history:', error);
        return null;
      }
    },
    [fetchHistory]
  );

  const deleteFromHistory = useCallback(
    async (id: number): Promise<boolean> => {
      try {
        const success = await historyAdapter.delete(id);
        if (success) {
          setItems((prev) => prev.filter((item) => item.id !== id));
          setTotal((prev) => prev - 1);
        }
        return success;
      } catch (error) {
        console.error('Failed to delete from history:', error);
        return false;
      }
    },
    []
  );

  const clearHistory = useCallback(async (): Promise<boolean> => {
    try {
      await historyAdapter.clear();
      setItems([]);
      setTotal(0);
      setHasMore(false);
      return true;
    } catch (error) {
      console.error('Failed to clear history:', error);
      return false;
    }
  }, []);

  return {
    items,
    isLoading,
    total,
    hasMore,
    fetchHistory,
    saveToHistory,
    deleteFromHistory,
    clearHistory,
  };
}
