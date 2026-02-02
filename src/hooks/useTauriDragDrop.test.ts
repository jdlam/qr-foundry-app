import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { useTauriDragDrop } from './useTauriDragDrop';

vi.mock('@tauri-apps/api/webviewWindow');

describe('useTauriDragDrop', () => {
  let mockEventHandler: ((event: { payload: { type: string; paths?: string[] } }) => void) | null =
    null;
  let mockUnlisten: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockEventHandler = null;
    mockUnlisten = vi.fn();

    vi.mocked(getCurrentWebviewWindow).mockReturnValue({
      onDragDropEvent: vi.fn((handler) => {
        mockEventHandler = handler;
        return Promise.resolve(mockUnlisten);
      }),
    } as unknown as ReturnType<typeof getCurrentWebviewWindow>);
  });

  it('initializes with isDragging false and empty droppedFiles', () => {
    const { result } = renderHook(() => useTauriDragDrop());

    expect(result.current.isDragging).toBe(false);
    expect(result.current.droppedFiles).toEqual([]);
  });

  it('registers drag-drop event listener on mount', () => {
    renderHook(() => useTauriDragDrop());

    expect(getCurrentWebviewWindow).toHaveBeenCalled();
    expect(getCurrentWebviewWindow().onDragDropEvent).toHaveBeenCalled();
  });

  it('unregisters event listener on unmount', async () => {
    const { unmount } = renderHook(() => useTauriDragDrop());

    unmount();

    await waitFor(() => {
      expect(mockUnlisten).toHaveBeenCalled();
    });
  });

  it('sets isDragging to true on drag over event', async () => {
    const { result } = renderHook(() => useTauriDragDrop());

    await waitFor(() => {
      expect(mockEventHandler).not.toBeNull();
    });

    act(() => {
      mockEventHandler!({ payload: { type: 'over' } });
    });

    expect(result.current.isDragging).toBe(true);
  });

  it('sets isDragging to false on drag leave event', async () => {
    const { result } = renderHook(() => useTauriDragDrop());

    await waitFor(() => {
      expect(mockEventHandler).not.toBeNull();
    });

    // First trigger over, then leave
    act(() => {
      mockEventHandler!({ payload: { type: 'over' } });
    });
    expect(result.current.isDragging).toBe(true);

    act(() => {
      mockEventHandler!({ payload: { type: 'leave' } });
    });
    expect(result.current.isDragging).toBe(false);
  });

  it('sets droppedFiles and isDragging to false on drop event', async () => {
    const { result } = renderHook(() => useTauriDragDrop());

    await waitFor(() => {
      expect(mockEventHandler).not.toBeNull();
    });

    const testPaths = ['/path/to/image.png', '/path/to/another.jpg'];

    act(() => {
      mockEventHandler!({ payload: { type: 'over' } });
    });
    expect(result.current.isDragging).toBe(true);

    act(() => {
      mockEventHandler!({ payload: { type: 'drop', paths: testPaths } });
    });

    expect(result.current.isDragging).toBe(false);
    expect(result.current.droppedFiles).toEqual(testPaths);
  });

  it('calls onDrop callback when files are dropped', async () => {
    const onDropCallback = vi.fn();
    renderHook(() => useTauriDragDrop(onDropCallback));

    await waitFor(() => {
      expect(mockEventHandler).not.toBeNull();
    });

    const testPaths = ['/path/to/logo.png'];

    act(() => {
      mockEventHandler!({ payload: { type: 'drop', paths: testPaths } });
    });

    expect(onDropCallback).toHaveBeenCalledWith(testPaths);
  });

  it('clearDroppedFiles resets droppedFiles to empty array', async () => {
    const { result } = renderHook(() => useTauriDragDrop());

    await waitFor(() => {
      expect(mockEventHandler).not.toBeNull();
    });

    const testPaths = ['/path/to/file.png'];

    act(() => {
      mockEventHandler!({ payload: { type: 'drop', paths: testPaths } });
    });
    expect(result.current.droppedFiles).toEqual(testPaths);

    act(() => {
      result.current.clearDroppedFiles();
    });
    expect(result.current.droppedFiles).toEqual([]);
  });

  it('updates callback ref when onDrop prop changes', async () => {
    const firstCallback = vi.fn();
    const secondCallback = vi.fn();

    const { rerender } = renderHook(({ onDrop }) => useTauriDragDrop(onDrop), {
      initialProps: { onDrop: firstCallback },
    });

    await waitFor(() => {
      expect(mockEventHandler).not.toBeNull();
    });

    // Change the callback
    rerender({ onDrop: secondCallback });

    const testPaths = ['/new/path.png'];

    act(() => {
      mockEventHandler!({ payload: { type: 'drop', paths: testPaths } });
    });

    // Should call the new callback, not the old one
    expect(firstCallback).not.toHaveBeenCalled();
    expect(secondCallback).toHaveBeenCalledWith(testPaths);
  });
});
