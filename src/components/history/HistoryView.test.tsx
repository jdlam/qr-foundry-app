import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HistoryView } from './HistoryView';
import { useQrStore } from '../../stores/qrStore';
import { toast } from 'sonner';

// Mock the hooks
vi.mock('../../hooks/useHistory', () => ({
  useHistory: vi.fn(() => ({
    items: [],
    isLoading: false,
    total: 0,
    hasMore: false,
    fetchHistory: vi.fn(),
    saveToHistory: vi.fn().mockResolvedValue(1),
    deleteFromHistory: vi.fn().mockResolvedValue(true),
    clearHistory: vi.fn().mockResolvedValue(true),
  })),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { useHistory } from '../../hooks/useHistory';

const mockUseHistory = vi.mocked(useHistory);

const mockHistoryItems = [
  {
    id: 1,
    content: 'https://example.com',
    qrType: 'url',
    label: 'Example Site',
    styleJson: JSON.stringify({ dotStyle: 'rounded', foreground: '#000000' }),
    thumbnail: 'data:image/png;base64,abc',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    content: 'tel:+15551234567',
    qrType: 'phone',
    label: null,
    styleJson: JSON.stringify({ dotStyle: 'square', foreground: '#ff0000' }),
    thumbnail: null,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

const createMockUseHistory = (overrides = {}) => ({
  items: [],
  isLoading: false,
  total: 0,
  hasMore: false,
  fetchHistory: vi.fn(),
  saveToHistory: vi.fn().mockResolvedValue(1),
  deleteFromHistory: vi.fn().mockResolvedValue(true),
  clearHistory: vi.fn().mockResolvedValue(true),
  ...overrides,
});

describe('HistoryView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useQrStore.getState().reset();
    mockUseHistory.mockReturnValue(createMockUseHistory());
  });

  describe('empty state', () => {
    it('renders empty state when no history', () => {
      render(<HistoryView />);
      expect(screen.getByText('No history yet')).toBeInTheDocument();
    });

    it('shows loading state', () => {
      mockUseHistory.mockReturnValue(createMockUseHistory({ isLoading: true }));
      render(<HistoryView />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('with history items', () => {
    it('renders history items', () => {
      mockUseHistory.mockReturnValue(createMockUseHistory({
        items: mockHistoryItems,
        total: 2,
      }));

      render(<HistoryView />);

      expect(screen.getByText('https://example.com')).toBeInTheDocument();
      expect(screen.getByText('tel:+15551234567')).toBeInTheDocument();
      expect(screen.getByText('Example Site')).toBeInTheDocument();
    });

    it('shows history count in header', () => {
      mockUseHistory.mockReturnValue(createMockUseHistory({
        items: mockHistoryItems,
        total: 2,
      }));

      render(<HistoryView />);
      expect(screen.getByText('History (2)')).toBeInTheDocument();
    });

    it('shows Clear All button when items exist', () => {
      mockUseHistory.mockReturnValue(createMockUseHistory({
        items: mockHistoryItems,
        total: 2,
      }));

      render(<HistoryView />);
      expect(screen.getByText('Clear All')).toBeInTheDocument();
    });
  });

  describe('item selection', () => {
    it('selects item on click', () => {
      mockUseHistory.mockReturnValue(createMockUseHistory({
        items: mockHistoryItems,
        total: 2,
      }));

      render(<HistoryView />);
      fireEvent.click(screen.getByText('https://example.com'));

      // Should show action buttons for selected item (with emoji prefixes)
      expect(screen.getByText(/Load in Generator/)).toBeInTheDocument();
      expect(screen.getByText(/Copy/)).toBeInTheDocument();
      expect(screen.getByText(/Delete/)).toBeInTheDocument();
    });

    it('shows item label in detail view', () => {
      mockUseHistory.mockReturnValue(createMockUseHistory({
        items: mockHistoryItems,
        total: 2,
      }));

      render(<HistoryView />);
      fireEvent.click(screen.getByText('https://example.com'));

      // Label appears both in list and detail view
      const labels = screen.getAllByText('Example Site');
      expect(labels.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('loading item in generator', () => {
    it('loads item into generator and shows success toast', async () => {
      mockUseHistory.mockReturnValue(createMockUseHistory({
        items: mockHistoryItems,
        total: 2,
      }));

      render(<HistoryView />);
      fireEvent.click(screen.getByText('https://example.com'));
      fireEvent.click(screen.getByText(/Load in Generator/));

      expect(useQrStore.getState().content).toBe('https://example.com');
      expect(toast.success).toHaveBeenCalledWith('Loaded in Generator');
    });

    it('shows error toast on invalid style JSON', async () => {
      const itemWithBadStyle = {
        ...mockHistoryItems[0],
        styleJson: 'invalid json',
      };

      mockUseHistory.mockReturnValue(createMockUseHistory({
        items: [itemWithBadStyle],
        total: 1,
      }));

      render(<HistoryView />);
      fireEvent.click(screen.getByText('https://example.com'));
      fireEvent.click(screen.getByText(/Load in Generator/));

      expect(toast.error).toHaveBeenCalledWith('Failed to load style');
    });
  });

  describe('copy to clipboard', () => {
    it('copies content and shows success toast', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: { writeText: writeTextMock },
      });

      mockUseHistory.mockReturnValue(createMockUseHistory({
        items: mockHistoryItems,
        total: 2,
      }));

      render(<HistoryView />);
      fireEvent.click(screen.getByText('https://example.com'));
      const copyButtons = screen.getAllByText(/Copy/);
      fireEvent.click(copyButtons[0]);

      expect(writeTextMock).toHaveBeenCalledWith('https://example.com');
      expect(toast.success).toHaveBeenCalledWith('Copied to clipboard');
    });
  });

  describe('deleting items', () => {
    it('deletes item and shows success toast', async () => {
      const deleteFromHistory = vi.fn().mockResolvedValue(true);

      mockUseHistory.mockReturnValue(createMockUseHistory({
        items: mockHistoryItems,
        total: 2,
        deleteFromHistory,
      }));

      render(<HistoryView />);
      fireEvent.click(screen.getByText('https://example.com'));
      fireEvent.click(screen.getByText(/Delete/));

      await waitFor(() => {
        expect(deleteFromHistory).toHaveBeenCalledWith(1);
        expect(toast.success).toHaveBeenCalledWith('Deleted from history');
      });
    });
  });

  describe('clearing all history', () => {
    it('clears all history after confirmation', async () => {
      const clearHistory = vi.fn().mockResolvedValue(true);
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      mockUseHistory.mockReturnValue(createMockUseHistory({
        items: mockHistoryItems,
        total: 2,
        clearHistory,
      }));

      render(<HistoryView />);
      fireEvent.click(screen.getByText('Clear All'));

      await waitFor(() => {
        expect(clearHistory).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalledWith('History cleared');
      });
    });

    it('does not clear if user cancels confirmation', async () => {
      const clearHistory = vi.fn();
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      mockUseHistory.mockReturnValue(createMockUseHistory({
        items: mockHistoryItems,
        total: 2,
        clearHistory,
      }));

      render(<HistoryView />);
      fireEvent.click(screen.getByText('Clear All'));

      expect(clearHistory).not.toHaveBeenCalled();
    });
  });

  describe('search', () => {
    it('renders search input', () => {
      mockUseHistory.mockReturnValue(createMockUseHistory({
        items: mockHistoryItems,
        total: 2,
      }));

      render(<HistoryView />);
      expect(screen.getByPlaceholderText('Search history...')).toBeInTheDocument();
    });

    it('triggers search on input', async () => {
      const fetchHistory = vi.fn();

      mockUseHistory.mockReturnValue(createMockUseHistory({
        items: mockHistoryItems,
        total: 2,
        fetchHistory,
      }));

      render(<HistoryView />);
      const searchInput = screen.getByPlaceholderText('Search history...');
      fireEvent.change(searchInput, { target: { value: 'example' } });

      await waitFor(() => {
        expect(fetchHistory).toHaveBeenCalledWith(50, 0, 'example');
      });
    });

    it('shows no results message when search has no matches', () => {
      mockUseHistory.mockReturnValue(createMockUseHistory());

      render(<HistoryView />);
      const searchInput = screen.getByPlaceholderText('Search history...');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      expect(screen.getByText('No results found')).toBeInTheDocument();
    });
  });

  describe('load more', () => {
    it('shows Load More button when hasMore is true', () => {
      mockUseHistory.mockReturnValue(createMockUseHistory({
        items: mockHistoryItems,
        total: 100,
        hasMore: true,
      }));

      render(<HistoryView />);
      expect(screen.getByText('Load More')).toBeInTheDocument();
    });

    it('calls fetchHistory with offset on Load More click', async () => {
      const fetchHistory = vi.fn();

      mockUseHistory.mockReturnValue(createMockUseHistory({
        items: mockHistoryItems,
        total: 100,
        hasMore: true,
        fetchHistory,
      }));

      render(<HistoryView />);
      fireEvent.click(screen.getByText('Load More'));

      expect(fetchHistory).toHaveBeenCalledWith(50, 2, undefined);
    });
  });

  describe('fetching history on mount', () => {
    it('fetches history on mount', () => {
      const fetchHistory = vi.fn();

      mockUseHistory.mockReturnValue(createMockUseHistory({ fetchHistory }));

      render(<HistoryView />);
      expect(fetchHistory).toHaveBeenCalled();
    });
  });
});
