import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTauriDragDrop } from './useTauriDragDrop';
import { dragDropAdapter } from '@platform';
import type { DragDropCallback } from '../platform/types';

const mockListen = vi.mocked(dragDropAdapter.listen);

describe('useTauriDragDrop', () => {
  let capturedCallback: DragDropCallback | null = null;
  let mockUnlisten: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    capturedCallback = null;
    mockUnlisten = vi.fn();

    mockListen.mockImplementation(async (callback) => {
      capturedCallback = callback;
      return mockUnlisten as unknown as () => void;
    });
  });

  it('initializes with isDragging false and empty droppedFiles', () => {
    const { result } = renderHook(() => useTauriDragDrop());

    expect(result.current.isDragging).toBe(false);
    expect(result.current.droppedFiles).toEqual([]);
  });

  it('registers drag-drop event listener on mount', () => {
    renderHook(() => useTauriDragDrop());

    expect(mockListen).toHaveBeenCalled();
  });

  it('unregisters event listener on unmount', async () => {
    const { unmount } = renderHook(() => useTauriDragDrop());

    // Wait for the listen promise to resolve
    await waitFor(() => {
      expect(capturedCallback).not.toBeNull();
    });

    unmount();

    await waitFor(() => {
      expect(mockUnlisten).toHaveBeenCalled();
    });
  });

  it('sets isDragging to true on drag over event', async () => {
    const { result } = renderHook(() => useTauriDragDrop());

    await waitFor(() => {
      expect(capturedCallback).not.toBeNull();
    });

    act(() => {
      capturedCallback!({ type: 'over' });
    });

    expect(result.current.isDragging).toBe(true);
  });

  it('sets isDragging to false on drag leave event', async () => {
    const { result } = renderHook(() => useTauriDragDrop());

    await waitFor(() => {
      expect(capturedCallback).not.toBeNull();
    });

    // First trigger over, then leave
    act(() => {
      capturedCallback!({ type: 'over' });
    });
    expect(result.current.isDragging).toBe(true);

    act(() => {
      capturedCallback!({ type: 'leave' });
    });
    expect(result.current.isDragging).toBe(false);
  });

  it('sets droppedFiles and isDragging to false on drop event', async () => {
    const { result } = renderHook(() => useTauriDragDrop());

    await waitFor(() => {
      expect(capturedCallback).not.toBeNull();
    });

    const testPaths = ['/path/to/image.png', '/path/to/another.jpg'];

    act(() => {
      capturedCallback!({ type: 'over' });
    });
    expect(result.current.isDragging).toBe(true);

    act(() => {
      capturedCallback!({ type: 'drop', paths: testPaths });
    });

    expect(result.current.isDragging).toBe(false);
    expect(result.current.droppedFiles).toEqual(testPaths);
  });

  it('calls onDrop callback when files are dropped', async () => {
    const onDropCallback = vi.fn();
    renderHook(() => useTauriDragDrop(onDropCallback));

    await waitFor(() => {
      expect(capturedCallback).not.toBeNull();
    });

    const testPaths = ['/path/to/logo.png'];

    act(() => {
      capturedCallback!({ type: 'drop', paths: testPaths });
    });

    expect(onDropCallback).toHaveBeenCalledWith(testPaths);
  });

  it('clearDroppedFiles resets droppedFiles to empty array', async () => {
    const { result } = renderHook(() => useTauriDragDrop());

    await waitFor(() => {
      expect(capturedCallback).not.toBeNull();
    });

    const testPaths = ['/path/to/file.png'];

    act(() => {
      capturedCallback!({ type: 'drop', paths: testPaths });
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
      expect(capturedCallback).not.toBeNull();
    });

    // Change the callback
    rerender({ onDrop: secondCallback });

    const testPaths = ['/new/path.png'];

    act(() => {
      capturedCallback!({ type: 'drop', paths: testPaths });
    });

    // Should call the new callback, not the old one
    expect(firstCallback).not.toHaveBeenCalled();
    expect(secondCallback).toHaveBeenCalledWith(testPaths);
  });
});
