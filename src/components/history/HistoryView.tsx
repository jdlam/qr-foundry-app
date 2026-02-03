import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useHistory, type HistoryItem } from '../../hooks/useHistory';
import { useQrStore } from '../../stores/qrStore';

export function HistoryView() {
  const { items, isLoading, total, hasMore, fetchHistory, deleteFromHistory, clearHistory } =
    useHistory();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleSearch = useCallback(
    (term: string) => {
      setSearchTerm(term);
      fetchHistory(50, 0, term || undefined);
    },
    [fetchHistory]
  );

  const handleLoadMore = useCallback(() => {
    fetchHistory(50, items.length, searchTerm || undefined);
  }, [fetchHistory, items.length, searchTerm]);

  const handleSelectItem = useCallback((item: HistoryItem) => {
    setSelectedItem(item);
  }, []);

  const handleLoadItem = useCallback(
    (item: HistoryItem) => {
      const store = useQrStore.getState();
      store.setContent(item.content);

      // Parse and apply the style
      try {
        const style = JSON.parse(item.styleJson);
        if (style.dotStyle) store.setDotStyle(style.dotStyle);
        if (style.cornerSquareStyle) store.setCornerSquareStyle(style.cornerSquareStyle);
        if (style.cornerDotStyle) store.setCornerDotStyle(style.cornerDotStyle);
        if (style.foreground) store.setForeground(style.foreground);
        if (style.background) store.setBackground(style.background);
        if (style.transparentBg !== undefined) store.setTransparentBg(style.transparentBg);
        if (style.logo) store.setLogo(style.logo);
        if (style.errorCorrection) store.setErrorCorrection(style.errorCorrection);
        toast.success('Loaded in Generator');
      } catch {
        toast.error('Failed to load style');
      }
    },
    []
  );

  const handleDelete = useCallback(
    async (id: number) => {
      const success = await deleteFromHistory(id);
      if (success) {
        toast.success('Deleted from history');
        if (selectedItem?.id === id) {
          setSelectedItem(null);
        }
      }
    },
    [deleteFromHistory, selectedItem]
  );

  const handleClearAll = useCallback(async () => {
    if (window.confirm('Are you sure you want to clear all history?')) {
      const success = await clearHistory();
      if (success) {
        toast.success('History cleared');
        setSelectedItem(null);
      }
    }
  }, [clearHistory]);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left Panel */}
      <div className="w-72 border-r border-border flex flex-col overflow-hidden shrink-0">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] font-bold text-muted uppercase tracking-wider">
              History ({total})
            </div>
            {items.length > 0 && (
              <button
                onClick={handleClearAll}
                className="text-[10px] text-danger hover:underline"
              >
                Clear All
              </button>
            )}
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search history..."
            className="w-full bg-surface-hover border border-border rounded-md px-3 py-2 text-xs text-text outline-none focus:border-accent/50"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoading && items.length === 0 ? (
            <div className="text-center text-dim text-xs py-8">Loading...</div>
          ) : items.length === 0 ? (
            <div className="text-center text-dim text-xs py-8">
              {searchTerm ? 'No results found' : 'No history yet'}
            </div>
          ) : (
            <>
              {items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelectItem(item)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedItem?.id === item.id
                      ? 'bg-accent/10 border-accent/30'
                      : 'bg-surface-hover border-border hover:border-accent/20'
                  }`}
                >
                  <div className="font-mono text-xs text-text truncate">{item.content}</div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[9px] font-semibold bg-accent/15 text-accent px-1.5 py-0.5 rounded uppercase">
                      {item.qrType}
                    </span>
                    <span className="text-[10px] text-dim">{formatTime(item.createdAt)}</span>
                  </div>
                  {item.label && (
                    <div className="text-[10px] text-muted mt-1 truncate">{item.label}</div>
                  )}
                </div>
              ))}

              {hasMore && (
                <button
                  onClick={handleLoadMore}
                  disabled={isLoading}
                  className="w-full py-2 text-xs text-muted hover:text-accent border border-border rounded-lg hover:bg-surface-hover transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Loading...' : 'Load More'}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Right Panel */}
      <div
        className="flex-1 flex flex-col items-center justify-center p-6"
        style={{
          background:
            'radial-gradient(ellipse at center, var(--surface-hover) 0%, var(--bg) 70%)',
        }}
      >
        {selectedItem ? (
          <div className="text-center max-w-md">
            {selectedItem.thumbnail && (
              <img
                src={selectedItem.thumbnail}
                alt="QR Preview"
                className="w-48 h-48 mx-auto mb-4 rounded-lg border border-border"
              />
            )}
            <div className="text-lg text-text font-semibold mb-2">
              {selectedItem.label || 'QR Code'}
            </div>
            <div className="font-mono text-sm text-muted bg-surface p-4 rounded-lg border border-border break-all max-h-32 overflow-y-auto">
              {selectedItem.content}
            </div>
            <div className="flex gap-2 mt-4 justify-center">
              <button
                onClick={() => handleLoadItem(selectedItem)}
                className="px-4 py-2 bg-accent/20 border border-accent/50 text-accent rounded-lg text-sm font-semibold hover:bg-accent/30 transition-all"
              >
                ◧ Load in Generator
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(selectedItem.content);
                  toast.success('Copied to clipboard');
                }}
                className="px-4 py-2 bg-surface-hover border border-border rounded-lg text-sm font-semibold hover:bg-border/50 transition-all"
              >
                📋 Copy
              </button>
              <button
                onClick={() => handleDelete(selectedItem.id)}
                className="px-4 py-2 bg-danger/10 border border-danger/30 text-danger rounded-lg text-sm font-semibold hover:bg-danger/20 transition-all"
              >
                🗑 Delete
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center text-dim">
            <span className="text-5xl block mb-3 opacity-30">↻</span>
            <div className="text-sm text-muted">Select an item from history</div>
            <div className="text-[11px] mt-1">Click to preview, then load into generator</div>
          </div>
        )}
      </div>
    </div>
  );
}
